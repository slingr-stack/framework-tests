Feature: Filter table by reference field
  # Test Case: TC-011
  # Spec File: table-view-reference-filter.spec.ts
  # Test Name: should filter tasks by project reference
  # Status:    passed

  Scenario: Filter table by reference field
    Given I am logged in and on the tasks table
    When I open the Project reference filter
    And I select a project option
    And I apply the filters
    Then the table should only show tasks for that project
