import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PdfLayoutTests(unittest.TestCase):
    def test_pdf_design_system_is_eager_only_where_immediately_required(self):
        mealpack_html = (ROOT / "pages/mealpack.html").read_text()
        self.assertIn("../assets/js/pdf-style.js", mealpack_html)
        for relative_page in ("pages/recipe.html", "pages/shopping-list.html"):
            with self.subTest(page=relative_page):
                self.assertNotIn("../assets/js/pdf-style.js", (ROOT / relative_page).read_text())

        config_script = (ROOT / "assets/js/config.js").read_text()
        self.assertIn("async function ensurePDFLibraries", config_script)
        self.assertIn("assets/js/pdf-style.js", config_script)

    def test_generators_use_shared_measured_layouts(self):
        recipe_script = (ROOT / "assets/js/recipes.js").read_text()
        shopping_script = (ROOT / "assets/js/shopping.js").read_text()
        mealpack_script = (ROOT / "assets/js/mealpack.js").read_text()

        self.assertIn("WillsGrillPDF.drawRecipePages", recipe_script)
        self.assertIn("WillsGrillPDF.drawShoppingPages", shopping_script)
        self.assertIn("WillsGrillPDF.drawRecipePages", mealpack_script)
        self.assertIn("WillsGrillPDF.drawShoppingPages", mealpack_script)
        self.assertIn("assets/images/recipes/thumbs/${recipe.image}", mealpack_script)
        self.assertIn("quantity: item.quantity * scaledQuantity", mealpack_script)
        self.assertIn("scaled: scaledQuantity > 1", mealpack_script)

        for script in (recipe_script, shopping_script, mealpack_script):
            self.assertNotIn("doc.addImage(", script)

    def test_shared_layout_has_overflow_and_rounded_image_protection(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        for required_feature in (
            "drawRoundedImage",
            "measureStepLayout",
            "drawMethodContinuationPages",
            "measureIngredientLayout",
            "drawIngredientContinuationPages",
            "drawStepBoxes",
            "drawShoppingPages",
            "doc.clip()",
        ):
            with self.subTest(feature=required_feature):
                self.assertIn(required_feature, shared_script)

    def test_recipe_status_tags_follow_difficulty_in_the_metadata_row(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn('drawPill(doc, recipe.difficulty, titleX + 74, 65.2, 29);', shared_script)
        self.assertIn('drawStatusPill(doc, "Treat", statusX, 65.2, 20, THEME.black);', shared_script)
        self.assertIn('drawStatusPill(doc, "Freezeable", statusX, 65.2, 28, THEME.blue, 6.4);', shared_script)

    def test_recipe_number_is_appended_to_the_pdf_title(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn('const reference = recipeNumber ? `(Recipe ${recipeNumber})` : "";', shared_script)
        self.assertIn('doc.setTextColor(...THEME.muted);', shared_script)
        self.assertIn('doc.text(reference, titleX + titleTextWidth + 3, 41.5);', shared_script)

    def test_recipe_pdf_centres_method_text_and_rebalances_type_sizes(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn('const textY = circleY + .75 - (((entry.lines.length - 1) * lineHeight) / 2);', shared_script)
        self.assertIn('let fontSize = compact ? 8.2 : 8.6;', shared_script)
        self.assertIn('let tipFontSize = 7.4;', shared_script)

    def test_scaled_meal_pack_recipes_are_labelled_in_gold(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn('options.scaled ? "(Scaled)" : ""', shared_script)
        self.assertIn('doc.setTextColor(...THEME.gold);', shared_script)

    def test_pdf_header_and_ingredient_section_spacing_are_balanced(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn('doc.text("Healthy food.", 70, 11.6);', shared_script)
        self.assertIn('doc.text("Simple cooking.", 70, 18);', shared_script)
        self.assertIn('isHeading ? 6.6 : 4.3', shared_script)
        self.assertIn('isHeading ? 5.2 : 3.4', shared_script)

    def test_pdf_ingredient_preparation_notes_use_the_shared_seamless_formatter(self):
        shared_script = (ROOT / "assets/js/pdf-style.js").read_text()
        self.assertIn("measureIngredientEntry", shared_script)
        ui_script = (ROOT / "assets/js/ui.js").read_text()
        self.assertIn('`${ingredient}, ${preparation}.`', ui_script)
        self.assertIn("lines.push(formatRecipeIngredient(item));", ui_script)


if __name__ == "__main__":
    unittest.main()
