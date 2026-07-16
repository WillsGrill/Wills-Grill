# Will's Grill AI Instructions

These instructions apply to the entire repository. Follow them whenever creating,
editing, reviewing, or illustrating a recipe.

## Product principles

Will's Grill means: **Healthy food. Simple cooking.**

Recipes must prioritise, in this order:

1. Heart health.
2. Excellent flavour.
3. Convenient cooking with minimal washing up.
4. Reasonable preparation and cooking time.
5. Reuse of ingredients already present in the recipe database.

Do not change recipes, data, images, or generated pages unless the user asks.

## Canonical repository data

- 'data/recipes/recipes.json' is the canonical recipe database.
- 'data/ingredients/ingredients.json' is the canonical ingredient database.
- 'recipes/rec###.html' and 'sitemap.xml' are generated outputs.
- 'assets/images/recipes/rec###.webp' contains full recipe images.
- 'assets/images/recipes/thumbs/rec###.webp' contains browse thumbnails.

Before adding an ingredient, search the ingredient database for an adequate
existing ingredient and reuse its ID. Add a new ingredient only when necessary
and no existing ingredient is an adequate replacement. Follow existing ID,
category, unit, pantry, and treat conventions.

After recipe-data changes, run:

    python3 tools/generate_static_recipes.py
    python3 -m unittest discover -s tests -p 'test_*.py'
    git diff --check

Review generated changes before completing the task.

## Repository structure

- 'index.html' is the public homepage.
- 'pages/' contains the public Browse, Recipe, Shopping List, and Meal Pack
  application pages.
- 'recipes/' contains generated, crawlable static recipe pages. Do not edit these
  pages directly.
- 'data/recipes/recipes.json' and 'data/ingredients/ingredients.json' are the
  canonical public data sources.
- 'assets/css/' contains public website and meal-pack styles.
- 'assets/js/' contains public application, shopping, recipe, meal-pack, and PDF
  logic.
- 'assets/images/recipes/' contains full recipe images; its 'thumbs/' directory
  contains corresponding browse thumbnails.
- 'assets/vendor/' contains deliberately local third-party browser assets.
- 'tools/generate_static_recipes.py' generates static recipe pages and the
  sitemap from canonical data.
- 'tests/' contains Python integrity tests and Playwright end-to-end tests.
- 'recipemanager/' is the local recipe and ingredient editor. Its save API is
  provided only by 'recipemanager/local_server.py'.
- 'source/' is reserved source material and does not currently power the public
  website.
- 'robots.txt', 'sitemap.xml', '404.html', and 'favicon.svg' are public
  deployment files.

## Engineering principles

- Keep the website deliberately simple. It is a static, dependency-light
  website, not a framework application.
- Do not introduce new features, dependencies, build systems, frameworks,
  services, APIs, databases, analytics, authentication, or third-party
  integrations unless the user explicitly requests them.
- Make the smallest change that fully satisfies the request.
- Do not redesign unrelated areas or perform speculative refactoring.
- Preserve existing behaviour, visual language, URLs, data formats, naming
  conventions, browser storage keys, and generated-file workflows.
- Prefer existing utilities, components, styles, ingredients, and patterns
  before creating new ones.
- Avoid abstraction for one-off behaviour. Introduce shared code only when it
  removes meaningful duplication or prevents inconsistency.
- Do not edit generated recipe pages directly. Change canonical data or the
  generator, then regenerate the outputs.
- Treat existing uncommitted changes as user-owned. Do not overwrite, revert, or
  reformat unrelated work.
- Keep changes accessible, responsive, secure, and compatible with modern
  Chrome, Edge, Firefox, and Safari.
- Maintain keyboard operation, visible focus, semantic HTML, reduced-motion
  support, and appropriate touch-target sizes.
- Escape untrusted content before inserting it into HTML. Do not weaken existing
  validation or security controls.
- Avoid unnecessary page weight. Defer optional code, optimise images, and do
  not load data or libraries on pages that do not need them.
- Use repository-relative assets and avoid runtime third-party dependencies
  where a local solution already exists.
- When requirements are ambiguous, inspect existing conventions and choose the
  least disruptive interpretation. Ask the user only when alternatives would
  materially change the outcome.
- Do not claim completion without proportionate validation.

## Working and validation rules

- Inspect relevant files and existing tests before editing.
- Use 'rg' or 'rg --files' for repository searches.
- Preserve unrelated changes in a dirty working tree.
- Regenerate static recipe pages whenever canonical recipe data or the generator
  changes.
- Run the narrowest relevant checks during development, followed by:

      python3 -m unittest discover -s tests -p 'test_*.py'
      git diff --check

- Run Playwright when Node and browser dependencies are available. If they are
  unavailable, report that limitation clearly rather than implying browser tests
  passed.
- Review the final diff for accidental generated files, obsolete assets, broken
  paths, stale cache versions, and unrelated formatting changes.

## Recipe requirements

### Health

- Favour vegetables, pulses, whole grains, fish, skinless poultry, unsaturated
  fats, fibre, and sensible portions.
- Keep saturated fat and added salt as low as reasonably possible without making
  the dish bland.
- Prefer modest quantities of rapeseed oil or extra-virgin olive oil.
- Prefer low-salt stocks, sauces, and tinned products where available.
- Build flavour with acidity, herbs, spices, aromatics, chilli, umami, and
  browning before adding salt, sugar, or saturated fat.
- Do not make unqualified medical or disease-prevention claims.

### Protein and treats

- Most recipes should use lean, low-saturated-fat primary proteins such as
  chicken breast, turkey, fish, beans, lentils, or chickpeas.
- Richer or processed meats may be used when appropriate, but recipes whose
  primary protein is an occasional food must be classified as a treat.
- Treat status is derived from ingredient records, not a recipe-level 'treat'
  property. Set or reuse the relevant ingredient's 'treat' boolean.
- Keep treat ingredients used only as flavourings modest.

### Convenience

- State the target serving count. Use two or four servings unless the user asks
  for a different yield.
- Identify the equipment the recipe requires, such as an oven, hob, air fryer,
  slow cooker, saucepan, frying pan, or baking tray.
- Design for minimal washing up: favour one-pan, one-pot, tray-bake, air-fryer,
  or single-bowl methods where they suit the dish.
- Avoid unnecessary decanting, pre-cooking, separate sauces, and specialist
  equipment.
- Reuse ingredients found across existing recipes where practical so combined
  shopping lists remain simple.
- Use UK supermarket terminology, metric measurements, and realistic UK pack
  sizes.
- Make no pantry assumptions other than salt, pepper, and water. Every other
  ingredient, including cooking oil, must appear in the ingredient list.
- Favour shelf-stable or convenient forms when flavour is not materially harmed:
  bottled lemon or lime juice, Easy Garlic, Easy Ginger, pastes, dried spices,
  tinned pulses, and frozen vegetables that retain good texture.
- Use fresh ingredients when they materially improve the dish. Fresh herbs are
  welcome when they have a meaningful flavour role.
- Do not choose convenience products that noticeably damage flavour or texture;
  for example, do not default to frozen diced onion instead of fresh onion.

### Flavour and method

- A healthy recipe must still be satisfying. Include deliberate seasoning,
  browning, texture contrast, acidity, or a balanced dressing or sauce.
- Include at least one deliberate source of acidity, spice, browning, texture,
  or umami, chosen to suit the dish.
- Keep methods accessible to a confident beginner and state useful visual
  doneness cues.
- Include food-safety wording where relevant, especially for poultry, minced
  meat, pork, fish, and reheating.
- Every recipe must contain **exactly eight meaningful method steps**. Never pad
  or arbitrarily split steps merely to reach eight.
- Ensure every ingredient is used in the method and every ingredient mentioned
  in the method exists in the ingredient list.
- Quantities, servings, timing, nutrition, category, difficulty, description,
  and chef's tip must agree with the method.
- Provide estimated nutrition per serving and sanity-check it against the listed
  quantities, serving count, and primary ingredients.
- State whether leftovers refrigerate or freeze well, including practical
  storage or reheating guidance where appropriate.
- The chef's tip must provide a useful substitution, storage suggestion, or
  genuine time-saving technique rather than repeat a method step.

## Recipe acceptance checklist

Before finalising a recipe:

1. Check that it is heart-conscious, flavourful, and practical.
2. Check whether washing up or active time can be reduced without harming it.
3. Search for existing ingredient IDs and convenient ingredient forms.
4. Confirm any new ingredient is necessary and easy to buy.
5. Confirm the primary protein and treat classification are appropriate.
6. Confirm there are exactly eight substantial steps.
7. Cross-check every ingredient against the method and chef's tip.
8. Confirm only salt, pepper, and water have been treated as implicit pantry
   ingredients.
9. Sanity-check servings, equipment, total time, difficulty, pack sizes, and
   estimated nutrition per serving.
10. Confirm the leftovers guidance and chef's tip are genuinely useful.
11. Regenerate static pages and run the repository tests.

## Recipe image requirements

Generate images **one at a time**. Inspect each result against the recipe and this
brief. If it does not match, perform a second generation or edit pass before
accepting it.

Create a photorealistic, high-resolution food photograph for Will's Grill, a
premium recipe website with the tagline “Healthy food. Simple cooking.”

The photograph must accurately represent the recipe. Every visible food or
garnish must be a recipe ingredient. Ingredients that would naturally be hidden
or incorporated do not need to be visible.

### Style

- Ultra-realistic professional food photography.
- Premium cookbook/editorial quality.
- Healthy, fresh, appetising, and achievable by a confident home cook.
- Never fine dining, fast food, cartoon-like, or artificially styled.
- Natural colours and realistic textures.

### Camera and lighting

- DSLR quality at a 45-degree angle.
- Landscape, 16:9 composition.
- Food fills approximately 80% of the frame.
- Sharp food focus with shallow depth of field and soft background blur.
- Bright natural daylight from the left, soft shadows, and a warm but natural
  white balance.
- No harsh or dramatic lighting.

### Plating and setting

- One healthy single-serving portion.
- Matte white ceramic plate or shallow bowl.
- Neat but natural plating.
- Light oak tabletop and a modern, bright kitchen atmosphere.
- Minimal styling and clean space around the plate.

### Garnishes and props

- Garnishes must be genuine recipe ingredients and appropriate to the dish.
- Fresh herbs only when the recipe contains them.
- No flowers, unnecessary sauces, or decorative ingredients.
- Prefer no props. If useful, include at most one folded white linen napkin,
  small wooden board, or small bowl containing a recipe ingredient.
- No cutlery, drinks, hands, people, logos, text, or watermarks.

### Food appearance

- Vegetables should be vibrant and ingredients fresh.
- Meat and fish should look correctly and safely cooked.
- No burnt food, excessive oil, exaggerated steam, artificial appearance,
  unrealistic colour, or unrealistic portion size.
- Show only one meal and avoid busy or restaurant-style table settings.

### Output and repository format

- Generate at the highest practical quality. A high-quality JPEG may be used as
  the generation source.
- The committed website asset must use the existing lowercase naming convention:
  'rec###.webp'.
- Save the full 16:9 WebP at 'assets/images/recipes/rec###.webp'.
- Save its optimised 16:9 thumbnail at
  'assets/images/recipes/thumbs/rec###.webp'.
- Preserve composition and aspect ratio during conversion and thumbnailing.
- Do not leave obsolete JPEG or PNG versions after verifying the WebP files.

## Image acceptance checklist

Before accepting an image:

1. Compare every visible food, garnish, sauce, and prop with the recipe.
2. Confirm there are no unlisted ingredients.
3. Confirm the protein, carbohydrate, vegetables, sauce, and cooking method
   look consistent with the recipe.
4. Confirm one serving, white ceramic plating, light oak setting, left daylight,
   45-degree view, shallow depth of field, and 16:9 landscape composition.
5. Confirm there is no text, logo, watermark, person, hand, cutlery, drink, or
   distracting prop.
6. Confirm full and thumbnail WebP files use the correct ID and load.
7. Regenerate or edit once if the first result does not pass.
