Feature: Logout clears session
  # Test Case: TC-004
  # Spec File: auth.spec.ts
  # Test Name: logout clears session and redirects to login
  # Status:    passed

  Scenario: Logout clears session
    Given I am logged in as admin
    When I click the logout button
    Then I should be redirected to the login page
