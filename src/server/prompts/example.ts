/**
 * One-shot example shown to the model before the real idea (Auto mode).
 * It demonstrates the procedure in the system prompt: a cheap "should" in the
 * MVP, a low-confidence "must" ranking below a cheap extra, every MoSCoW
 * category used, labelled risks, validation tests with pass signals, and no
 * invented statistics. Kept valid against AnalysisSchema by tests/analysis.test.ts.
 */
export const EXAMPLE_IDEA = "Student clubs at my university often order too much food for their events, and the leftovers get thrown away. I want to build a web app where club organizers post leftover food (what, where, until when) and students nearby get a notification so they can come and take it. Later we could add a map, ratings for clubs, and a points system. We are 3 students with basic web skills and one semester.";

export const EXAMPLE_OUTPUT = {
  "overview": {
    "verdict": "Clear problem, unproven pickup habit",
    "summary": "Club organizers post leftover event food; nearby students get an alert and collect it before it is thrown away.",
    "problem": "Clubs often over-order food for events and leftovers are thrown away. Today students have no way to hear about it.",
    "targetUsers": ["Club organizers who run food events", "Students on campus"]
  },
  "framework": {
    "recommended": "rice",
    "reason": "Features are concrete and the audience is one campus, so reach, impact and effort can be compared to set build order."
  },
  "features": [
    {
      "id": "post-leftovers",
      "name": "Post leftovers",
      "description": "Organizer form: what food, where, until when.",
      "whyItMatters": "Half of the core loop; nothing to collect without it.",
      "rice": {
        "reach": 300,
        "reachReasoning": "Assumption: ~300 students on one campus sign up and see listings per quarter.",
        "impact": 2,
        "confidence": 0.8,
        "effort": 1.5,
        "effortReasoning": "Form, one database table, list page.",
        "evidence": ["Clubs often order too much food", "Organizers post what, where, until when"],
        "assumptions": ["Organizers will post right after events"]
      },
      "moscow": { "category": "must", "reasoning": "Without posts the problem is not solved." }
    },
    {
      "id": "pickup-alerts",
      "name": "Pickup alerts",
      "description": "Email or push alert to subscribed students when food is posted.",
      "whyItMatters": "Leftovers expire fast; students must hear quickly.",
      "rice": {
        "reach": 300,
        "reachReasoning": "Same ~300 signed-up students (assumption).",
        "impact": 2,
        "confidence": 0.5,
        "effort": 3,
        "effortReasoning": "Subscriptions, sending service, opt-out.",
        "evidence": ["Students nearby get a notification"],
        "assumptions": ["Students will come within the time window"]
      },
      "moscow": { "category": "must", "reasoning": "Without alerts most food expires unseen." }
    },
    {
      "id": "mark-gone",
      "name": "Mark as gone",
      "description": "Button to mark a listing as finished.",
      "whyItMatters": "Prevents wasted trips.",
      "rice": {
        "reach": 150,
        "reachReasoning": "Assumption: about half of users make a trip per quarter.",
        "impact": 1,
        "confidence": 0.8,
        "effort": 0.5,
        "effortReasoning": "One status field and button.",
        "evidence": ["Listings have an 'until when' time"],
        "assumptions": ["Food often runs out early"]
      },
      "moscow": {
        "category": "should",
        "reasoning": "Expiry time is a workaround, but it is cheap enough for the MVP."
      }
    },
    {
      "id": "campus-map",
      "name": "Campus map",
      "description": "Map view of active listings.",
      "whyItMatters": "Helps judge if a pickup is worth the walk.",
      "rice": {
        "reach": 150,
        "reachReasoning": "Assumption: half of users would open a map.",
        "impact": 0.5,
        "confidence": 0.8,
        "effort": 3,
        "effortReasoning": "Map library, locations, mobile layout.",
        "evidence": ["User suggests a map later"],
        "assumptions": ["Text locations suffice on one campus"]
      },
      "moscow": { "category": "could", "reasoning": "The list with locations already works." }
    },
    {
      "id": "points-ratings",
      "name": "Points and club ratings",
      "description": "Points for collecting, ratings for clubs.",
      "whyItMatters": "Might drive repeat use once activity is regular.",
      "rice": {
        "reach": 100,
        "reachReasoning": "Assumption: only regular users care.",
        "impact": 0.25,
        "confidence": 0.5,
        "effort": 4,
        "effortReasoning": "Scoring rules, profiles, abuse handling.",
        "evidence": ["User mentions ratings and points"],
        "assumptions": ["Free food motivates enough at first"]
      },
      "moscow": { "category": "wont", "reasoning": "Needs scale the product lacks; not now." }
    }
  ],
  "mvp": {
    "summary": "Organizers post, students get alerts and collect, listings can be marked gone. Pilot with a few clubs.",
    "featureIds": ["post-leftovers", "pickup-alerts", "mark-gone"]
  },
  "riceNotes": "Reach assumes one campus and ~300 signed-up students per quarter, a guess. Scores compare features; they are not forecasts.",
  "moscowNotes": {
    "must": "Posting and alerts are the core loop.",
    "should": "Mark as gone is cheap and avoids wasted trips.",
    "could": "A map is a convenience over text locations.",
    "wont": "Points and ratings need regular users first."
  },
  "recommendations": {
    "buildFirst": [
      "Post leftovers: simplest half of the loop",
      "Pickup alerts: gets listings to people in time",
      "Mark as gone: half a week, avoids wasted trips"
    ],
    "postpone": ["Campus map until users ask", "Points and ratings until weekly activity exists"],
    "risks": [
      "Desirability: students may not walk over for small leftovers",
      "Desirability: organizers may forget to post",
      "Viability: food-safety rules may forbid giving food away"
    ],
    "validation": [
      "Share leftovers in a group chat after 3 events; pass if food is gone within 30 minutes",
      "Ask 5 organizers to try posting; pass if 3 agree"
    ]
  },
  "missingInformation": [
    "How many clubs host food events, and how often",
    "University rules on giving away leftovers",
    "Who maintains the app after the semester"
  ],
  "suggestions": [
    {
      "type": "test",
      "title": "Run it in a group chat first",
      "detail": "Post leftovers from 3 club events in one chat and see if food is gone within 30 minutes."
    },
    {
      "type": "clarify",
      "title": "Check the food-safety rules",
      "detail": "Ask the student union whether clubs may give away leftover event food."
    },
    {
      "type": "scope",
      "title": "Skip the map and points for now",
      "detail": "Text locations work on one campus; add extras only once pickups happen weekly."
    }
  ]
} as const;
