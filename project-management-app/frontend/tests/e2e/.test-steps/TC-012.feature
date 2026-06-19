Feature: Navigate nested modals
  # Test Case: TC-012
  # Spec File: nested-modal-navigation.spec.ts
  # Test Name: should navigate through nested drawers
  # Status:    passed

  Scenario: Navigate nested modals
    Given I am viewing a task in a drawer
    When I click on a related entity link
    Then a nested drawer should open
    And I should see the related entity details
