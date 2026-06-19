Feature: Delete a task
  # Test Case: TC-008
  # Spec File: tasks-crud.spec.ts
  # Test Name: should delete the task
  # Status:    passed

  Scenario: Delete a task
    Given I am viewing a task in the drawer
    When I click the Delete button
    And I confirm the deletion
    Then the task should no longer appear in the table
