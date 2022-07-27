//
//  ContentView.swift
//  MattermostShare
//
// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
//

import SwiftUI

struct ContentView: View {
  @EnvironmentObject var shareViewModel: ShareViewModel
  
  @Binding var attachments: [AttachmentModel]
  @Binding var linkPreviewUrl: String
  @Binding var message: String
  
  var hasChannels: Bool {
    shareViewModel.server?.hasChannels ?? false
  }
  
  var body: some View {
    VStack {
      if (!linkPreviewUrl.isEmpty) {
        LinkPreview(
          link: $linkPreviewUrl,
          message: $message
        )
      }
      
      if (!attachments.isEmpty) {
        AttachmentsView(attachments: $attachments)
          .padding(.horizontal, -20)
      }
      
      if (!linkPreviewUrl.isEmpty || !attachments.isEmpty) {
        Divider()
          .padding(.top, 10)
      }
      
      VStack (spacing: 0) {
        if shareViewModel.allServers.count > 1 {
          OptionView(
            navigationTitle: "Select server",
            label: "Server",
            value: shareViewModel.server!.displayName
          ) {
            ServerListView()
          }
          .frame(height: 48)
        }
        if hasChannels {
          OptionView(
            navigationTitle: "Select channel",
            label: "Channel",
            value: "\(shareViewModel.channel!.displayName) \(shareViewModel.channel!.formattedTeamName)"
          ) {
            ChannelListView()
          }
          .frame(height: 48)
        }
      }
      .padding(.all, 0)
      
      Divider()
        .padding(.bottom, 10)
      
      if hasChannels {
        FloatingTextField(placeholderText: "Enter a message (optional)", text: $message)
      } else {
        ErrorLabelView(
          error: "You are not a member of a team on the selected server. Select another server or open Mattermost to join a team."
        )
      }
      
      Spacer()
    }
//    .keyboardAdaptive()
  }
}
