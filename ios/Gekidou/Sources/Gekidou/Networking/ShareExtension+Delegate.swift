//
//  File.swift
//  
//
//  Created by Elias Nahum on 26-06-22.
//

import Foundation
import os.log

extension ShareExtension: URLSessionDataDelegate {
    func createBackroundSession(id: String, delegateQueue: OperationQueue = OperationQueue()) {
        let config = URLSessionConfiguration.background(withIdentifier: id)
        config.sharedContainerIdentifier = appGroupId
        config.waitsForConnectivity = true
        config.httpAdditionalHeaders = ["X-Requested-With": "XMLHttpRequest"]
        config.allowsCellularAccess = true
        config.timeoutIntervalForRequest = 10
        config.timeoutIntervalForResource = 10
        config.httpMaximumConnectionsPerHost = 10

        self.backgroundSession = URLSession.init(
            configuration: config,
            delegate: self,
            delegateQueue: delegateQueue
        )
        
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: Created identifier=%{public}@",
            id
        )
    }
    
    public func attachSession(id: String, completionHandler: @escaping () -> Void) {
        self.completionHandler = completionHandler
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: Attached session with completionHandler identifier=%{public}@",
            id
        )
        createBackroundSession(
            id: id,
            delegateQueue: OperationQueue.main
        )
    }
    
    public func urlSession(_ session: URLSession,
                    task: URLSessionTask,
                    didReceive challenge: URLAuthenticationChallenge,
                    completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void) {
        
        return Network.default.urlSession(
            session,
            task: task,
            didReceive: challenge,
            completionHandler: completionHandler
        )
    }
    
    public func urlSession(_ session: URLSession, dataTask: URLSessionDataTask, didReceive data: Data) {
        guard let id = session.configuration.identifier,
          let uploadData = getUploadSessionData(id: id)
         else {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: didReceived failed to getUploadSessionData identifier=%{public}@",
                session.configuration.identifier ?? "no identifier"
            )
            return
        }
        do {
            let json = try JSONSerialization.jsonObject(with: data, options: []) as! NSDictionary
            if let fileInfos = json.object(forKey: "file_infos") as? NSArray,
               fileInfos.count > 0 {
                let fileData = fileInfos[0] as! NSDictionary
                let fileId = fileData.object(forKey: "id") as! String
                appendCompletedUploadToSession(id: id, fileId: fileId)
                let total = uploadData.totalFiles
                let count = uploadData.fileIds.count + 1
                
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: identifier=%{public}@ did upload file %{public}@ total files %{public}@ of %{public}@",
                    id,
                    fileId,
                    "\(count)",
                    "\(total)"
                )
                
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: Append file to session identifier=%{public}@ file=%{public}@",
                    id,
                    fileId
                )
            } else {
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: identifier=%{public}@ no file info received %{public}@",
                    id,
                    json
                )
            }
        } catch {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: Failed to receive data identifier=%{public}@ error=%{public}",
                id,
                error.localizedDescription
            )
            
            print("Mattermost BackgroundSession: Failed to get the file upload response for id %@ %@", id, error.localizedDescription)
        }
    }
    
    public func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        if error == nil,
           let id = session.configuration.identifier {
            guard let data = getUploadSessionData(id: id)
            else {
                os_log(
                    OSLogType.default,
                    "Mattermost BackgroundSession: didCompleteWithError failed to getUploadSessionData identifier=%{public}@",
                    session.configuration.identifier ?? "no identifier"
                )
                return
                
            }
            
            let total = data.totalFiles
            let count = data.fileIds.count
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: didCompleteWithError for identifier=%{public}@ total files %{public}@ of %{public}@",
                id,
                "\(count)",
                "\(total)"
            )
            if data.fileIds.count == data.totalFiles {
                ProcessInfo().performExpiringActivity(
                    withReason: "Need to post the message") {expires in
                        os_log(
                            OSLogType.default,
                            "Mattermost BackgroundSession: posting message for identifier=%{public}@",
                            id
                        )
                        self.postMessageForSession(withId: id)
                        self.urlSessionDidFinishEvents(forBackgroundURLSession: session)
                    }
            }
        } else if error != nil {
            os_log(
                OSLogType.default,
                "Mattermost BackgroundSession: didCompleteWithError failed identifier=%{public}@ with error %{public}@",
                session.configuration.identifier ?? "no identifier",
                error?.localizedDescription ?? "no error description available"
            )
        }
    }
    
    
    public func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        os_log(
            OSLogType.default,
            "Mattermost BackgroundSession: urlSessionDidFinishEvents identifier=%{public}@",
            session.configuration.identifier ?? "no identifier"
        )
        
        DispatchQueue.main.asyncAfter(
            deadline: DispatchTime.now() + .seconds(1),
            execute: {
                if let handler = self.completionHandler {
                    os_log(
                        OSLogType.default,
                        "Mattermost BackgroundSession: Called completionHandler"
                    )
                    handler()
                }
            })
    }
}
