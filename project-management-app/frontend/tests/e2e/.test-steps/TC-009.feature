Feature: Bulk change priority
  # Test Case: TC-009
  # Spec File: bulk-actions.spec.ts
  # Test Name: should execute bulk change priority action
  # Status:    failed

  Scenario: Bulk change priority
    Given I am logged in and on the tasks table
    When I select multiple rows via checkboxes
    And I click the Bulk Change Priority action
    And I select a priority in the dialog
    And I execute the dialog
    Then I should see the updated priorities in the table
