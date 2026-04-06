# User Story 3 Human Acceptance Test

## User Story

As a restaurant diner, I want to see a visual preview of a dish even if the restaurant does not have professional photos so that I can better imagine what the food will look like before ordering.

## Story Scope Being Tested

This test covers the AI image flow on the diner dish detail page:

- opening a dish detail page for a dish without an existing image
- triggering AI image generation from the detail page
- displaying the generated image on the dish detail page
- verifying that generation completes in a reasonable time
- verifying that the image is presented as a helpful approximation, not an exact photograph

## Preconditions

Before the tester begins, set up the app in the following state:

1. The app is installed and runs locally with `npm install` and `npm start`.
2. The project `.env` is configured, including:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_KEY`
   - `EXPO_PUBLIC_MENU_API_URL`
3. The backend image-generation service is running and connected to the configured AI image provider.
4. The tester can sign in as a diner.
5. There is at least one accessible diner menu scan with a dish that:
   - has a usable dish name and description
   - does not already have a stored image when the first run begins
6. The moderator should know which dish will be used for the first run and, if possible, should keep a second device or second run available to verify the cached experience.
7. The tester should use normal Wi-Fi or campus network conditions.
8. The moderator should have a stopwatch or phone timer available.

## Test Environment Notes

- Recommended device: phone running Expo Go or simulator with the current development build
- Starting screen: an existing diner menu scan opened in the diner flow
- No coaching during the task unless the tester is completely blocked
- If the same dish is tested twice, note whether the second load appears faster because the image is already cached

## Human Test Instructions

Give the tester only the task below and avoid narrating the UI unless they are stuck.

### Task Prompt for the Tester

"You are considering ordering a dish that does not have a restaurant photo. Use the app to see whether the generated image helps you picture the dish well enough to support your decision."

### Steps

1. Launch the app and sign in as a diner if needed.
2. Open an existing diner menu scan.
3. Choose the target dish that does not already show a dish image.
4. Tap the dish to open its detail page.
5. Confirm that the page opens and shows dish details before image generation.
6. Tap the `View AI Image` button.
7. Start timing when the button is pressed.
8. Wait for the image generation flow to finish.
9. Stop timing when the generated image appears or when the flow clearly fails.
10. Examine the generated image and compare it to the dish name, summary, ingredients, and flavor cues shown on the page.
11. Say out loud:
    - what parts of the dish the image helped you picture
    - whether anything in the image feels misleading or confusing
    - whether you understand that the image is an approximation
12. If possible, reopen the same dish on a second pass and note whether the image is already available without waiting for generation again.

## Expected Outcomes

The story is considered behaviorally successful during testing if the tester can do the following without moderator assistance:

- open the dish detail page
- trigger image generation from the detail page
- view the generated image on the same page
- describe how the image changes their mental picture of the dish
- recognize that the generated image is suggestive, not guaranteed to be exact

## Satisfaction Metrics

These are the three most important human-verifiable metrics for this story.

### 1. Visualization lift

**Metric:** Percentage of testers who report that the image made it easier to picture the dish compared with text alone.

**Why this metric:** This is the core customer outcome for the feature. The value of AI-generated food imagery is not that an image exists, but that it reduces imagination effort and supports ordering confidence. This is an actionable product metric in the Lean Startup sense because it measures whether the feature changes the user’s ability to make a decision, not just whether they clicked a button.

### 2. Approximation understanding rate

**Metric:** Percentage of testers who correctly describe the image as a helpful approximation rather than an exact representation of what will arrive at the table.

**Why this metric:** This protects trust. If users mistake the image for a literal restaurant photo, the feature may increase disappointment rather than confidence. This metric matters because it tests comprehension of product intent, which is critical for a feature that can otherwise overpromise. It is also stronger than simply asking whether the user "liked" the image.

### 3. Decision value rate

**Metric:** Percentage of testers who say the image would meaningfully help them decide whether to order the dish.

**Why this metric:** The feature exists to influence a real ordering decision, not to decorate the screen. This question is framed around actual behavior and value, which is closer to The Mom Test style of evidence than a generic satisfaction prompt. It also aligns with lecture emphasis on metrics tied to user decisions and willingness to keep using or paying for the product.

## Survey Questions

Ask the tester these three questions immediately after they complete the task. These are phrased to surface real decision value and trust, not empty praise.

1. Before you saw the generated image, how clearly could you picture the dish, and what became clearer after the image appeared?
2. If this dish arrived looking somewhat different from the image, would that feel acceptable or misleading to you? Why?
3. In a real ordering situation, would having this image make you more likely, less likely, or no more likely to consider ordering the dish? Explain what drove that reaction.

## How to Score the Survey

- Question 1 supports the visualization lift metric.
- Question 2 supports the approximation understanding rate.
- Question 3 supports the decision value rate.

## Pass Threshold for This Story

Recommend marking this story as passing human acceptance when all of the following are true:

- at least 80% of testers say the image helped them visualize the dish better
- at least 80% of testers show they understand the image is an approximation, not an exact photo
- at least 70% of testers say the image adds meaningful value to their ordering decision
- the observed first-run generation time is generally under 5 seconds in normal conditions

## Test Log Template

Use the template below for each classmate trial.

```md
### Tester
- Name:
- Team:
- Date:
- Device:

### Observations
- Could open dish page without help: Yes / No
- Could find and use `View AI Image`: Yes / No
- Image appeared on dish detail page: Yes / No
- First-run generation time:
- Second-run or reopen appeared cached: Yes / No / Not tested
- Tester understood image was approximate: Yes / No

### Survey Responses
1.
2.
3.

### Outcome
- Passed / Failed
- Follow-up changes needed:
```
