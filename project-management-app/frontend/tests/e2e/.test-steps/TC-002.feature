Feature: Login with invalid credentials
  # Test Case: TC-002
  # Spec File: auth.spec.ts
  # Test Name: login with invalid credentials stays on login page
  # Status:    passed

  Scenario: Login with invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should remain on the login page
