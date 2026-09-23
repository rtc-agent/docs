---
title: Terms of Service
description: RTC Agent component terms of service — the terms and conditions for using the Service.
---

> Last updated: 2026-09-11

Welcome to RTC Agent ("the Service"). Please read these Terms of Service carefully. By using the Service, you agree to be bound by these terms.

## 1. Service Description

### 1.1 What is RTC Agent

RTC Agent is an open-source website AI assistant backend that enables websites to integrate AI assistant capabilities with just a few lines of code through the standardized Remote Tool Calling (RTC) protocol.

Core architectural features:

- **AI reasons on the server**: Conversations are powered by LLM (Large Language Model) for understanding and generation
- **Tools execute in the browser**: File operations, function calls, and other tools execute locally in your browser
- **Local-First design**: File data is stored only in your browser's IndexedDB and never uploaded to the server

### 1.2 Integration Method

The Service is embedded as a Web Component (`<rtc-agent>`) in third-party websites, such as Mermaid Live Editor. The host website configures the AI's role, available functions, and interaction patterns.

## 2. Accounts & Authentication

### 2.1 Account Requirements

Using the Service requires OAuth2 authentication. You must:

- Have an account with a supported OAuth2 provider (e.g., GitHub, Google)
- Provide accurate and current account information
- Be responsible for your account activities

### 2.2 Account Security

- Keep your account credentials secure
- Notify us immediately upon discovering unauthorized account use
- We are not liable for losses resulting from your failure to secure your account

## 3. Acceptable Use

### 3.1 Permitted Use Cases

- Creating and editing content through the AI assistant for lawful purposes
- Using tool functions to operate the local virtual file system
- Leveraging the memory system to enhance interaction experience

### 3.2 Prohibited Conduct

You may not:

- **Abuse the Service**: Send malicious content, spam, or engage in any illegal activity
- **Reverse engineer**: Decompile, disassemble, or attempt to obtain server-side source code
- **Bypass restrictions**: Attempt to circumvent security measures or usage limits
- **Impersonate others**: Use another person's account or impersonate another identity
- **Disrupt the Service**: Engage in any activity that may affect service stability

## 4. Intellectual Property

### 4.1 User Content

Content you create through the Service (such as Mermaid diagram code, file contents) belongs to you. We do not claim any ownership over user content.

### 4.2 Open-Source Components

RTC Agent is an open-source project, and related components are subject to their respective open-source licenses. Please visit the project repository for specific license information.

### 4.3 The Service Itself

The design, architecture, and code of the Service (excluding open-source components) are owned by us.

## 5. Disclaimers

### 5.1 AI-Generated Content

- AI-generated content may be inaccurate, incomplete, or erroneous
- **You should independently verify AI output accuracy** and not rely solely on AI suggestions
- AI-generated content does not constitute professional advice (including but not limited to legal, medical, or financial advice)

### 5.2 Service Availability

- The Service is provided "as is" with no guarantee of 100% availability
- We reserve the right to modify, suspend, or terminate the Service at any time
- We are not liable for losses caused by service interruptions

### 5.3 Local Data Risk

Since file data is stored only in your browser:

- **Clearing browser data will result in permanent file loss**
- Browser crashes or device failures may cause data loss
- We recommend regularly exporting important data
- We are not responsible for local data loss

## 6. Limitation of Liability

To the maximum extent permitted by applicable law:

- The Service is provided on an "as is" and "as available" basis
- We are not liable for any indirect, incidental, special, or consequential damages
- Our total liability shall not exceed the fees you paid for using the Service in the past 12 months (if any)

## 7. Changes to Terms

- We reserve the right to modify these terms at any time
- Modified terms will be posted on this page with the last updated date revised
- Material changes will be notified through in-service notices or email
- Continued use of the Service constitutes acceptance of the modified terms

## 8. Governing Law & Dispute Resolution

- These terms are governed by the laws of the jurisdiction where the project operator is located
- Disputes arising from these terms shall first be resolved through negotiation
- If negotiation fails, disputes shall be submitted to a court of competent jurisdiction

## 9. Miscellaneous

- These terms constitute the entire agreement between you and us regarding the Service
- If any provision is held invalid, the remaining provisions remain in effect
- Our failure to exercise any right does not constitute a waiver of that right

## 10. Contact Us

If you have questions about these Terms of Service, please contact us:

- Repository: [https://github.com/rtc-agent/docs](https://github.com/rtc-agent/docs)
- Service URL: `https://rtc-agent.cherish.chat`
