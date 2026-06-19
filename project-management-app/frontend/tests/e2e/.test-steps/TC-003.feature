Feature: Session persists after reload
  # Test Case: TC-003
  # Spec File: auth.spec.ts
  # Test Name: session persists after reload
  # Status:    passed

  Scenario: Session persists after reload
    Given I am logged in as admin
    When I reload the page
    Then I should still be logged in
