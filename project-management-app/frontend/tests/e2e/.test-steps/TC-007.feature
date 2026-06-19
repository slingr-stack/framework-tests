Feature: Edit an existing task
  # Test Case: TC-007
  # Spec File: tasks-crud.spec.ts
  # Test Name: should edit the task
  # Status:    passed

  Scenario: Edit an existing task
    Given I am viewing a task in the drawer
    When I click the Edit button
    And I modify the title field
    And I submit the save form
    Then I should see a success feedback message
