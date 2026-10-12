import { describeFeature, loadFeature } from "@amiceli/vitest-cucumber";
import { expect } from "vitest";
import { sweptCircleCircle, sweptRectCircle } from "./geometry";
import type { Circle, Rect, Vec2 } from "./math";

const feature = await loadFeature("./geometry.feature");

type Body<S> = { shape: S; position: Vec2; velocity: Vec2 };

describeFeature(feature, ({ defineSteps, Rule }) => {
  let circleA: Body<Circle>;
  let circleB: Body<Circle>;
  let rect: Body<Rect>;
  let circle: Body<Circle>;
  let t: number;

  defineSteps(({ Given, And, When, Then }) => {
    Given(
      "circle A of radius {number} at {number}, {number} moving {number}, {number}",
      (_, r, x, y, vx, vy) => {
        circleA = { shape: { r }, position: { x, y }, velocity: { x: vx, y: vy } };
      },
    );
    And(
      "circle B of radius {number} at {number}, {number} moving {number}, {number}",
      (_, r, x, y, vx, vy) => {
        circleB = { shape: { r }, position: { x, y }, velocity: { x: vx, y: vy } };
      },
    );
    Given(
      "a {number} by {number} rect at {number}, {number} moving {number}, {number}",
      (_, w, h, x, y, vx, vy) => {
        rect = { shape: { w, h }, position: { x, y }, velocity: { x: vx, y: vy } };
      },
    );
    And(
      "a circle of radius {number} at {number}, {number} moving {number}, {number}",
      (_, r, x, y, vx, vy) => {
        circle = { shape: { r }, position: { x, y }, velocity: { x: vx, y: vy } };
      },
    );

    When("the circles are swept", () => {
      t = sweptCircleCircle(
        circleA.shape,
        circleA.velocity,
        circleA.position,
        circleB.shape,
        circleB.velocity,
        circleB.position,
      );
    });
    When("the rect and circle are swept", () => {
      t = sweptRectCircle(
        rect.shape,
        rect.velocity,
        rect.position,
        circle.shape,
        circle.velocity,
        circle.position,
      );
    });

    Then("they first touch at t = {number}", (_, expected) => {
      expect(t, "time of first contact").toBeCloseTo(expected, 4);
    });
    Then("they never touch", () => {
      expect(t, "time of first contact").toBe(Infinity);
    });
    Then("they touch immediately", () => {
      expect(t, "time of first contact").toBe(0);
    });
  });

  // Every scenario is fully described by shared steps, so just register them.
  for (const rule of feature.rules) {
    Rule(rule.name, ({ RuleScenario }) => {
      for (const scenario of rule.scenarii) {
        RuleScenario(scenario.description, () => {});
      }
    });
  }
});
