---
description: Run e2e test on the chat page
argument-hint: [featureSteps]
---

# Use Browser to Verify Feature

Automates browser testing to verify a feature is working correctly in the application. Logs into the app using test credentials, validates the feature, and iterates on fixes until successful.

## Variables

- $featureSteps: $1 (required) - Description of the feature to verify (e.g., "user can create new projects", "dashboard displays metrics correctly")
- $testUrl: fetch TEST_URL from env
- $testUsername: fetch TEST_USERNAME from env
- $testPassword: fetch TEST_PASSWORD from env

## Instructions

1. Read `[text](../use-browser.md)` and follow the steps to login
