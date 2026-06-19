Feature: Create a new task
  # Test Case: TC-005
  # Spec File: tasks-crud.spec.ts
  # Test Name: should create a new task
  # Status:    passed

  Scenario: Create a new task
    Given I am logged in as admin
    And I navigate to /tasks
    When I click the Create button
    And I fill in the title field with a unique value
    And I select a project from the dropdown
    And I submit the creation form
    Then I should see a success feedback message
