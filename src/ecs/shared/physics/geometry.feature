Feature: Swept collision
  Shapes move in straight lines at constant velocity. A sweep reports the
  earliest time they touch.

  Rule: Circles that close the gap touch when the gap reaches zero

    Scenario: Circle moves head-on into a stationary circle
      Given circle A of radius 1 at -5, 0 moving 1, 0
      And circle B of radius 1 at 0, 0 moving 0, 0
      When the circles are swept
      Then they first touch at t = 3

    Scenario: Both circles move toward each other
      Given circle A of radius 1 at -5, 0 moving 1, 0
      And circle B of radius 1 at 5, 0 moving -1, 0
      When the circles are swept
      Then they first touch at t = 4

  Rule: Circles that never close the gap never touch

    Scenario: Circle moves away
      Given circle A of radius 1 at -5, 0 moving -1, 0
      And circle B of radius 1 at 0, 0 moving 0, 0
      When the circles are swept
      Then they never touch

    Scenario: Circle passes by on a parallel line
      Given circle A of radius 1 at -5, 3 moving 1, 0
      And circle B of radius 1 at 0, 0 moving 0, 0
      When the circles are swept
      Then they never touch

    Scenario: Both circles are stationary and apart
      Given circle A of radius 1 at -5, 0 moving 0, 0
      And circle B of radius 1 at 0, 0 moving 0, 0
      When the circles are swept
      Then they never touch

    Scenario: Circles move with the same velocity
      Given circle A of radius 1 at -5, 0 moving 2, 1
      And circle B of radius 1 at 0, 0 moving 2, 1
      When the circles are swept
      Then they never touch

  Rule: Circles that already overlap touch immediately

    Scenario: Circles overlap at the start
      Given circle A of radius 1 at 1, 0 moving 0, 0
      And circle B of radius 1 at 0, 0 moving 0, 0
      When the circles are swept
      Then they touch immediately

  Rule: A circle hitting a rect face touches when it reaches the inflated face

    Scenario: Circle moves into a stationary rect face
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 5, 0 moving -1, 0
      When the rect and circle are swept
      Then they first touch at t = 3

    Scenario: Rect moves into a stationary circle
      Given a 2 by 2 rect at 0, 0 moving 1, 0
      And a circle of radius 1 at 5, 0 moving 0, 0
      When the rect and circle are swept
      Then they first touch at t = 3

  Rule: A circle near a rect corner touches the rounded corner, not the box

    Scenario: Circle moves diagonally into a corner
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 5, 5 moving -1, -1
      When the rect and circle are swept
      Then they first touch at t = 3.2929

    Scenario: Circle grazes a corner
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 5, 1.9 moving -1, 0
      When the rect and circle are swept
      Then they first touch at t = 3.5641

    Scenario: Circle enters the inflated box corner but misses the rounded corner
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 5, 2.1 moving -1, 0
      When the rect and circle are swept
      Then they never touch

  Rule: A circle moving away from a rect never touches it

    Scenario: Circle moves away from a rect face
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 5, 0 moving 1, 0
      When the rect and circle are swept
      Then they never touch

  Rule: A circle already overlapping a rect touches immediately

    Scenario: Circle overlaps a rect at the start
      Given a 2 by 2 rect at 0, 0 moving 0, 0
      And a circle of radius 1 at 1.5, 0 moving 0, 0
      When the rect and circle are swept
      Then they touch immediately
