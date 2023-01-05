// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-console, no-process-env */

/*
 * This is used for saving artifacts to AWS S3, sending data to automation dashboard and
 * publishing quick summary to community channels.
 *
 * Usage: [ENV] node save_report.js
 *
 * Environment variables:
 *   BRANCH=[branch]                 : Branch identifier from CI
 *   BUILD_ID=[build_id]             : Build identifier from CI
 *   COMMIT_HASH=[commit_hash]       : Commit hash from repo
 *   DEVICE_NAME=[device_name]       : Name of the device used for testing
 *   DEVICE_OS_NAME=[device_os_name] : OS of the device used for testing
 *   HEADLESS=[boolean]              : Headed by default (false) or headless (true)
 *   IOS=[boolean]                   : Android by default (false) or iOS (true)
 *
 *   For saving artifacts to AWS S3
 *      - DETOX_AWS_S3_BUCKET, DETOX_AWS_ACCESS_KEY_ID and DETOX_AWS_SECRET_ACCESS_KEY
 *   For saving test cases to Test Management
 *      - ZEPHYR_ENABLE=true|false
 *      - ZEPHYR_API_KEY=[api_key]
 *      - JIRA_PROJECT_KEY=[project_key], e.g. "MM",
 *      - ZEPHYR_FOLDER_ID=[folder_id], e.g. 847997
 *   For sending hooks to Mattermost channels
 *      - FULL_REPORT, WEBHOOK_URL and TEST_CYCLE_LINK_PREFIX
 *   Test type
 *      - TYPE=[type], e.g. "MASTER", "PR", "RELEASE", "GEKIDOU"
 */

const os = require('os');
const path = require('path');

const fse = require('fs-extra');
const {mergeFiles} = require('junit-report-merger');
const shell = require('shelljs');

const {saveArtifacts} = require('./utils/artifacts');
const {ARTIFACTS_DIR} = require('./utils/constants');
const {
    generateJestStareHtmlReport,
    mergeJestStareJsonFiles,
} = require('./utils/jest_stare');
const {
    convertXmlToJson,
    generateShortSummary,
    generateTestReport,
    getAllTests,
    removeOldGeneratedReports,
    sendReport,
    readJsonFromFile,
    writeJsonToFile,
} = require('./utils/report');
const {createTestCycle, createTestExecutions} = require('./utils/test_cases');

require('dotenv').config();

const saveReport = async () => {
    const {
        DEVICE_NAME,
        DEVICE_OS_VERSION,
        HEADLESS,
        IOS,
        TYPE,
        WEBHOOK_URL,
        ZEPHYR_ENABLE,
        ZEPHYR_CYCLE_KEY,
    } = process.env;

    // Remove old generated reports
    removeOldGeneratedReports();

    const detox_version = shell.exec('npm list detox').stdout.split('\n')[1].split('@')[1].trim();
    const headless = IOS === 'true' ? false : HEADLESS === 'true';
    const os_name = os.platform();
    const os_version = os.release();
    const node_version = process.version;
    const npm_version = shell.exec('npm --version').stdout.trim();

    // Write environment details to file
    const environmentDetails = {
        detox_version,
        device_name: DEVICE_NAME,
        device_os_version: DEVICE_OS_VERSION,
        headless,
        os_name,
        os_version,
        node_version,
        npm_version,
    };
    writeJsonToFile(environmentDetails, 'environment.json', ARTIFACTS_DIR);

    // Merge all XML reports into one single XML report
    const platform = process.env.IOS === 'true' ? 'ios' : 'android';
    const combinedFilePath = `${ARTIFACTS_DIR}/${platform}-combined.xml`;
    await mergeFiles(path.join(__dirname, combinedFilePath), [`${ARTIFACTS_DIR}/${platform}-junit*.xml`]);
    console.log(`Merged, check ${combinedFilePath}`);

    // Read XML from a file
    const xml = fse.readFileSync(combinedFilePath);
    const {testsuites} = convertXmlToJson(xml);

    // Generate short summary, write to file and then send report via webhook
    const allTests = getAllTests(testsuites);
    const summary = generateShortSummary(allTests);
    console.log(summary);
    writeJsonToFile(summary, 'summary.json', ARTIFACTS_DIR);

    // Generate jest-stare report
    const jestStareOutputDir = path.join(__dirname, `${ARTIFACTS_DIR}/jest-stare`);
    const jestStareCombinedFilePath = `${jestStareOutputDir}/${platform}-combined.json`;
    await mergeJestStareJsonFiles(jestStareCombinedFilePath, [`${ARTIFACTS_DIR}/jest-stare/${platform}-data*.json`]);
    generateJestStareHtmlReport(jestStareOutputDir, `${platform}-report.html`, jestStareCombinedFilePath);

    const result = await saveArtifacts();
    if (result && result.success) {
        console.log('Successfully uploaded artifacts to S3:', result.reportLink);
    }

    // Create or use an existing test cycle
    let testCycle = {};
    if (ZEPHYR_ENABLE === 'true') {
        const {start, end} = summary.stats;
        testCycle = ZEPHYR_CYCLE_KEY ? {key: ZEPHYR_CYCLE_KEY} : await createTestCycle(start, end);
    }

    // Send test report to "QA: Mobile Test Automation Report" channel via webhook
    if (TYPE && TYPE !== 'NONE' && WEBHOOK_URL) {
        const environment = readJsonFromFile(`${ARTIFACTS_DIR}/environment.json`);
        const data = generateTestReport(summary, result && result.success, result && result.reportLink, environment, testCycle.key);
        await sendReport('summary report to Community channel', WEBHOOK_URL, data);
    }

    // Save test cases to Test Management
    if (ZEPHYR_ENABLE === 'true') {
        await createTestExecutions(allTests, testCycle);
    }
};

saveReport();
