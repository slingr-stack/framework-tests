Feature: Login with valid credentials
  # Test Case: TC-001
  # Spec File: auth.spec.ts
  # Test Name: login with valid credentials redirects to dashboard
  # Status:    passed

  Scenario: Login with valid credentials
    Given I am on the login page
    When I enter admin credentials
    Then I should be redirected to the dashboard
    And I should see the logged-in state
