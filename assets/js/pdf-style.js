/*
==================================================
Will's Grill shared PDF design system
==================================================
*/

"use strict";

const WillsGrillPDF = (() => {
    const THEME = Object.freeze({
        pageWidth: 297,
        pageHeight: 210,
        margin: 10,
        black: [0, 0, 0],
        white: [255, 255, 255],
        gold: [200, 162, 74],
        taglineGold: [215, 180, 90],
        text: [27, 27, 27],
        muted: [79, 79, 79],
        grey50: [250, 250, 250],
        grey100: [244, 244, 244],
        grey200: [232, 232, 232],
        grey300: [216, 216, 216],
        radius: 4,
        smallRadius: 2.5,
        contentBottom: 185,
        footerY: 194
    });

    function setDocumentProperties(doc, title, subject) {
        doc.setProperties({
            title,
            subject,
            author: "Will's Grill",
            creator: "Will's Grill",
            keywords: "healthy recipes, simple cooking, Mediterranean diet"
        });
    }

    function drawFrame(doc, assets = {}, headerTitle = "WILL'S GRILL", pageLabel = "") {
        const { pageWidth, pageHeight, black, white, gold, taglineGold, muted, grey50 } = THEME;

        doc.setFillColor(...grey50);
        doc.rect(0, 0, pageWidth, pageHeight, "F");
        doc.setFillColor(...black);
        doc.rect(0, 0, pageWidth, 23, "F");
        doc.setFillColor(...gold);
        doc.rect(0, 22.3, pageWidth, .7, "F");

        if (assets.logoData) {
            doc.addImage(assets.logoData, "JPEG", 10, 1.2, 40, 20);
        }

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.6);
        doc.setTextColor(...gold);
        doc.text(headerTitle, pageWidth - 10, 13.1, { align: "right" });
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(...white);
        doc.text("Healthy food.", 59, 9.7);
        doc.setTextColor(...taglineGold);
        doc.text("Simple cooking.", 59, 16.1);

        doc.setFontSize(7.2);
        doc.setTextColor(...muted);
        doc.text("Will's Grill  |  Healthy food. Simple cooking.", 12, THEME.footerY);
        if (pageLabel) doc.text(pageLabel, pageWidth - 12, THEME.footerY, { align: "right" });
    }

    function drawCard(doc, x, y, width, height, options = {}) {
        const fill = options.fill || THEME.white;
        const stroke = options.stroke || THEME.grey200;
        const radius = options.radius ?? THEME.radius;
        doc.setFillColor(...fill);
        doc.setDrawColor(...stroke);
        doc.setLineWidth(options.lineWidth ?? .25);
        doc.roundedRect(x, y, width, height, radius, radius, "FD");
    }

    function drawRoundedImage(doc, imageData, x, y, width, height, radius = THEME.smallRadius) {
        drawCard(doc, x, y, width, height, { fill: THEME.grey100, radius, lineWidth: 0 });
        if (!imageData) return;

        doc.saveGraphicsState();
        doc.roundedRect(x, y, width, height, radius, radius, null);
        doc.clip();
        if (typeof doc.discardPath === "function") doc.discardPath();
        const properties = doc.getImageProperties(imageData);
        const imageRatio = properties.width / properties.height;
        const boxRatio = width / height;
        let imageWidth = width;
        let imageHeight = height;
        let imageX = x;
        let imageY = y;
        if (imageRatio > boxRatio) {
            imageWidth = height * imageRatio;
            imageX = x - ((imageWidth - width) / 2);
        }
        else {
            imageHeight = width / imageRatio;
            imageY = y - ((imageHeight - height) / 2);
        }
        doc.addImage(imageData, "JPEG", imageX, imageY, imageWidth, imageHeight, undefined, "FAST");
        doc.restoreGraphicsState();
    }

    function lineHeightFactor(fontSize, lineHeight) {
        return lineHeight / (fontSize * 0.352778);
    }

    function wrapText(doc, text, width, options = {}) {
        const fontSize = options.fontSize || 8;
        const fontStyle = options.fontStyle || "normal";
        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        return doc.splitTextToSize(String(text ?? ""), width);
    }

    function drawText(doc, text, x, y, width, options = {}) {
        const fontSize = options.fontSize || 8;
        const lineHeight = options.lineHeight || fontSize * .42;
        const color = options.color || THEME.muted;
        const fontStyle = options.fontStyle || "normal";
        const lines = Array.isArray(text) ? text : wrapText(doc, text, width, { fontSize, fontStyle });

        doc.setFont("helvetica", fontStyle);
        doc.setFontSize(fontSize);
        doc.setTextColor(...color);
        doc.text(lines, x, y, { lineHeightFactor: lineHeightFactor(fontSize, lineHeight) });
        return { lines, height: lines.length * lineHeight, bottom: y + (lines.length * lineHeight) };
    }

    function fitSingleLineFont(doc, text, width, startSize = 18, minimumSize = 13) {
        let fontSize = startSize;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(fontSize);
        while (doc.getTextWidth(String(text)) > width && fontSize > minimumSize) {
            fontSize -= .5;
            doc.setFontSize(fontSize);
        }
        return fontSize;
    }

    function drawPill(doc, label, x, y, width) {
        doc.setFillColor(...THEME.grey100);
        doc.roundedRect(x, y, width, 7.5, 3.75, 3.75, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.2);
        doc.setTextColor(...THEME.text);
        doc.text(String(label), x + (width / 2), y + 4.9, { align: "center" });
    }

    function sectionTitle(doc, title, x, y) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.2);
        doc.setTextColor(...THEME.text);
        doc.text(String(title).toUpperCase(), x, y);
        doc.setFillColor(...THEME.gold);
        doc.roundedRect(x, y + 2, 12, .8, .4, .4, "F");
    }

    function measureIngredientLayout(doc, ingredientLines, width, availableHeight) {
        let fontSize = 7.8;
        let lineHeight = 3.35;
        let entries = [];

        do {
            entries = ingredientLines.map(text => {
                const lines = wrapText(doc, text, width, { fontSize });
                return { lines, height: Math.max(4.3, lines.length * lineHeight) };
            });
            const totalHeight = entries.reduce((sum, entry) => sum + entry.height, 0);
            if (totalHeight <= availableHeight || fontSize <= 6.6) break;
            fontSize -= .2;
            lineHeight -= .08;
        } while (fontSize >= 6.6);

        return {
            fontSize,
            lineHeight,
            entries,
            totalHeight: entries.reduce((sum, entry) => sum + entry.height, 0)
        };
    }

    function measureStepLayout(doc, steps, textWidth, availableHeight) {
        let fontSize = 8;
        let lineHeight = 3.35;
        let entries = [];

        do {
            entries = steps.map((step, index) => {
                const lines = wrapText(doc, step, textWidth, { fontSize });
                return {
                    index,
                    lines,
                    height: Math.max(8, (lines.length * lineHeight) + 3.4)
                };
            });
            const totalHeight = entries.reduce((sum, entry) => sum + entry.height, 0) + (Math.max(0, entries.length - 1) * 1.2);
            if (totalHeight <= availableHeight || fontSize <= 6.8) break;
            fontSize -= .2;
            lineHeight -= .08;
        } while (fontSize >= 6.8);

        return { fontSize, lineHeight, entries };
    }

    function entriesThatFit(entries, availableHeight, gap = 1.8) {
        let used = 0;
        let count = 0;
        for (const entry of entries) {
            const nextHeight = entry.height + (count ? gap : 0);
            if (used + nextHeight > availableHeight) break;
            used += nextHeight;
            count += 1;
        }
        return Math.max(1, count);
    }

    function drawStepBoxes(doc, entries, x, startY, width, fontSize, lineHeight, startNumber = 1) {
        let y = startY;
        entries.forEach((entry, localIndex) => {
            drawCard(doc, x, y, width, entry.height, {
                fill: THEME.grey100,
                stroke: THEME.grey200,
                radius: 2.5,
                lineWidth: .18
            });
            const circleY = y + 4;
            doc.setFillColor(...THEME.black);
            doc.circle(x + 4.8, circleY, 2.6, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.2);
            doc.setTextColor(...THEME.white);
            doc.text(String(startNumber + localIndex), x + 4.8, circleY + .1, { align: "center", baseline: "middle" });
            drawText(doc, entry.lines, x + 9.2, y + 3.5, width - 12, {
                fontSize,
                lineHeight,
                color: THEME.muted
            });
            y += entry.height + 1.2;
        });
        return y;
    }

    function drawRecipeHeader(doc, recipe, assets, serves) {
        drawCard(doc, 12, 29, 273, 49);
        drawRoundedImage(doc, assets.imageData, 16, 33, 54, 41, 3.5);

        const titleX = 77;
        const titleWidth = recipe.treat ? 181 : 199;
        const titleSize = fitSingleLineFont(doc, recipe.name, titleWidth, 18, 13);
        drawText(doc, recipe.name, titleX, 41.5, titleWidth, {
            fontSize: titleSize,
            lineHeight: 6.5,
            color: THEME.text,
            fontStyle: "bold"
        });
        if (recipe.treat) {
            doc.setFillColor(...THEME.black);
            doc.roundedRect(258, 34, 19, 7.5, 3.75, 3.75, "F");
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(...THEME.white);
            doc.text("TREAT", 267.5, 38.9, { align: "center" });
        }
        let descriptionSize = 8.4;
        let descriptionLines = wrapText(doc, recipe.description, 199, { fontSize: descriptionSize });
        while (descriptionLines.length > 2 && descriptionSize > 6.8) {
            descriptionSize -= .2;
            descriptionLines = wrapText(doc, recipe.description, 199, { fontSize: descriptionSize });
        }
        if (descriptionLines.length > 2) {
            descriptionLines = descriptionLines.slice(0, 2);
            descriptionLines[1] = `${descriptionLines[1].replace(/[.,;:]?$/, "")}...`;
        }
        drawText(doc, descriptionLines, titleX, 51.5, 199, {
            fontSize: descriptionSize,
            lineHeight: 3.35,
            color: THEME.muted
        });

        drawPill(doc, `${recipe.prepTime + recipe.cookTime} mins`, titleX, 65.2, 34);
        drawPill(doc, `Serves ${serves}`, titleX + 38, 65.2, 32);
        drawPill(doc, recipe.difficulty, titleX + 74, 65.2, 29);
    }

    function drawRecipeBasePage(doc, recipe, options, firstStepEntries, stepLayout) {
        const assets = options.assets || {};
        const serves = options.serves || recipe.serves;
        const ingredientLines = options.ingredientLines || [];

        drawFrame(doc, assets, "RECIPE CARD");
        drawRecipeHeader(doc, recipe, { ...assets, imageData: options.imageData }, serves);

        const panelY = 83;
        const panelHeight = 102;
        const ingredientsPanel = { x: 12, width: 65 };
        const methodPanel = { x: 82, width: 127 };
        const detailsPanel = { x: 214, width: 71 };

        drawCard(doc, ingredientsPanel.x, panelY, ingredientsPanel.width, panelHeight);
        drawCard(doc, methodPanel.x, panelY, methodPanel.width, panelHeight);
        sectionTitle(doc, "Ingredients", 17, 92);
        sectionTitle(doc, "Method", 87, 92);

        const ingredientLayout = measureIngredientLayout(doc, ingredientLines, 54, 78);
        let ingredientY = 101;
        ingredientLayout.entries.forEach(entry => {
            doc.setFillColor(...THEME.gold);
            doc.circle(18, ingredientY - 1, .65, "F");
            drawText(doc, entry.lines, 20.5, ingredientY, 52, {
                fontSize: ingredientLayout.fontSize,
                lineHeight: ingredientLayout.lineHeight,
                color: THEME.muted
            });
            ingredientY += entry.height;
        });

        drawStepBoxes(doc, firstStepEntries, 87, 99.5, 117, stepLayout.fontSize, stepLayout.lineHeight, 1);

        drawCard(doc, detailsPanel.x, panelY, detailsPanel.width, 39, { fill: THEME.grey100 });
        sectionTitle(doc, "Nutrition", 219, 92);
        doc.setFontSize(6.5);
        doc.setTextColor(...THEME.muted);
        doc.setFont("helvetica", "normal");
        doc.text("Per serving", 280, 92, { align: "right" });

        const nutritionRows = [
            ["Calories", recipe.nutrition.calories],
            ["Protein", `${recipe.nutrition.protein} g`],
            ["Carbs", `${recipe.nutrition.carbs} g`],
            ["Fat", `${recipe.nutrition.fat} g`]
        ];
        nutritionRows.forEach(([label, value], index) => {
            const x = 219 + ((index % 2) * 31.5);
            const y = 103 + (Math.floor(index / 2) * 9.5);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(6.8);
            doc.setTextColor(...THEME.muted);
            doc.text(label.toUpperCase(), x, y);
            doc.setFontSize(9.2);
            doc.setTextColor(...THEME.text);
            doc.text(String(value), x, y + 4.5);
        });

        drawCard(doc, detailsPanel.x, 127, detailsPanel.width, 58);
        sectionTitle(doc, "Chef's Tip", 219, 136);
        let tipFontSize = 8;
        let tipLineHeight = 3.45;
        let tipLines = wrapText(doc, recipe.tip, 61, { fontSize: tipFontSize });
        while ((tipLines.length * tipLineHeight) > 39 && tipFontSize > 6.6) {
            tipFontSize -= .2;
            tipLineHeight -= .08;
            tipLines = wrapText(doc, recipe.tip, 61, { fontSize: tipFontSize });
        }
        drawText(doc, tipLines, 219, 145, 61, {
            fontSize: tipFontSize,
            lineHeight: tipLineHeight,
            color: THEME.muted
        });
    }

    function drawMethodContinuationPages(doc, recipe, remainingSteps, assets, startNumber) {
        let steps = [...remainingSteps];
        let number = startNumber;

        while (steps.length) {
            doc.addPage();
            drawFrame(doc, assets, "RECIPE CARD");
            drawCard(doc, 12, 29, 273, 156);
            const titleSize = fitSingleLineFont(doc, `${recipe.name} - Method continued`, 263, 16, 12);
            drawText(doc, `${recipe.name} - Method continued`, 17, 40, 263, {
                fontSize: titleSize,
                lineHeight: 6,
                color: THEME.text,
                fontStyle: "bold"
            });
            sectionTitle(doc, "Method", 17, 52);
            const layout = measureStepLayout(doc, steps, 250, 121);
            const fitCount = entriesThatFit(layout.entries, 121, 1.2);
            const pageEntries = layout.entries.slice(0, fitCount);
            drawStepBoxes(doc, pageEntries, 17, 59, 263, layout.fontSize, layout.lineHeight, number);
            steps = steps.slice(fitCount);
            number += fitCount;
        }
    }

    function drawIngredientContinuationPages(doc, recipe, ingredientLines, assets) {
        let remaining = [...ingredientLines];

        while (remaining.length) {
            doc.addPage();
            drawFrame(doc, assets, "RECIPE CARD");
            drawCard(doc, 12, 29, 273, 156);
            const titleSize = fitSingleLineFont(doc, `${recipe.name} - Ingredients continued`, 263, 16, 12);
            drawText(doc, `${recipe.name} - Ingredients continued`, 17, 40, 263, {
                fontSize: titleSize,
                lineHeight: 6,
                color: THEME.text,
                fontStyle: "bold"
            });
            sectionTitle(doc, "Ingredients", 17, 52);

            const columnWidth = 126;
            const columnGap = 10;
            const maxColumnHeight = 121;
            let column = 0;
            let y = 61;
            let consumed = 0;

            for (const line of remaining) {
                const lines = wrapText(doc, line, columnWidth - 8, { fontSize: 8 });
                const height = Math.max(5, lines.length * 3.4);
                if (y + height > 61 + maxColumnHeight) {
                    if (column === 1) break;
                    column = 1;
                    y = 61;
                }
                const x = 19 + (column * (columnWidth + columnGap));
                doc.setFillColor(...THEME.gold);
                doc.circle(x, y - 1, .7, "F");
                drawText(doc, lines, x + 3, y, columnWidth - 8, {
                    fontSize: 8,
                    lineHeight: 3.4,
                    color: THEME.muted
                });
                y += height + 1.5;
                consumed += 1;
            }

            remaining = remaining.slice(consumed);
        }
    }

    function drawRecipePages(doc, recipe, options = {}) {
        const firstPage = doc.getNumberOfPages();
        const ingredientLines = options.ingredientLines || [];
        const ingredientLayout = measureIngredientLayout(doc, ingredientLines, 54, 78);
        const ingredientFitCount = ingredientLayout.totalHeight <= 78
            ? ingredientLines.length
            : entriesThatFit(ingredientLayout.entries, 78, 0);
        const stepLayout = measureStepLayout(doc, recipe.steps, 105, 81);
        const fitCount = entriesThatFit(stepLayout.entries, 81, 1.2);
        const firstEntries = stepLayout.entries.slice(0, fitCount);

        drawRecipeBasePage(doc, recipe, {
            ...options,
            ingredientLines: ingredientLines.slice(0, ingredientFitCount)
        }, firstEntries, stepLayout);

        if (fitCount < recipe.steps.length) {
            drawMethodContinuationPages(doc, recipe, recipe.steps.slice(fitCount), options.assets || {}, fitCount + 1);
        }
        if (ingredientFitCount < ingredientLines.length) {
            drawIngredientContinuationPages(doc, recipe, ingredientLines.slice(ingredientFitCount), options.assets || {});
        }

        return { firstPage, lastPage: doc.getNumberOfPages() };
    }

    function drawShoppingTitle(doc) {
        drawText(doc, "Shopping List", 12, 38, 180, {
            fontSize: 20,
            lineHeight: 7,
            color: THEME.text,
            fontStyle: "bold"
        });
        drawText(doc, "Ingredients are combined and grouped to make shopping simpler.", 12, 45, 220, {
            fontSize: 8.2,
            lineHeight: 3.4,
            color: THEME.muted
        });
    }

    function drawShoppingPages(doc, categoryBlocks, options = {}) {
        const assets = options.assets || {};
        const useCurrentPage = options.useCurrentPage !== false;
        const columns = 4;
        const gap = 4;
        const left = 12;
        const right = 285;
        const columnWidth = (right - left - (gap * (columns - 1))) / columns;
        const top = 52;
        const bottom = THEME.contentBottom;
        let column = 0;
        let currentY = top;
        let firstPage = null;
        let lastPage = null;

        const startPage = (reuse) => {
            if (!reuse) doc.addPage();
            drawFrame(doc, assets, "SHOPPING LIST");
            drawShoppingTitle(doc);
            column = 0;
            currentY = top;
            if (firstPage === null) firstPage = doc.getNumberOfPages();
            lastPage = doc.getNumberOfPages();
        };

        const moveColumn = () => {
            if (column < columns - 1) {
                column += 1;
                currentY = top;
            }
            else {
                startPage(false);
            }
        };

        startPage(useCurrentPage);

        categoryBlocks.forEach(block => {
            let remaining = [...block.entries];
            let continuation = false;

            while (remaining.length) {
                if (bottom - currentY < 23) moveColumn();

                const textWidth = columnWidth - 14;
                const fontSize = 7.7;
                const lineHeight = 3.25;
                const measured = remaining.map(entry => {
                    const lines = wrapText(doc, entry, textWidth, { fontSize });
                    return { entry, lines, height: Math.max(5.2, lines.length * lineHeight) };
                });
                const available = bottom - currentY - 16;
                let used = 0;
                let count = 0;
                for (const item of measured) {
                    if (used + item.height > available) break;
                    used += item.height;
                    count += 1;
                }
                if (!count) {
                    moveColumn();
                    continue;
                }

                const chunk = measured.slice(0, count);
                const cardHeight = 16 + used;
                const x = left + (column * (columnWidth + gap));
                drawCard(doc, x, currentY, columnWidth, cardHeight, {
                    fill: THEME.white,
                    stroke: THEME.grey200,
                    radius: 3
                });
                doc.setFont("helvetica", "bold");
                doc.setFontSize(8.2);
                doc.setTextColor(...THEME.text);
                const heading = continuation ? `${block.category} (continued)` : block.category;
                doc.text(heading.toUpperCase(), x + 4, currentY + 6.5);
                doc.setFillColor(...THEME.gold);
                doc.roundedRect(x + 4, currentY + 8, 11, .7, .35, .35, "F");

                let itemY = currentY + 15;
                chunk.forEach(item => {
                    doc.setDrawColor(...THEME.grey300);
                    doc.setLineWidth(.25);
                    doc.roundedRect(x + 4, itemY - 2.5, 2.7, 2.7, .5, .5, "S");
                    drawText(doc, item.lines, x + 8.5, itemY, textWidth, {
                        fontSize,
                        lineHeight,
                        color: THEME.muted
                    });
                    itemY += item.height;
                });

                remaining = remaining.slice(count);
                continuation = true;
                currentY += cardHeight + 3;
                if (remaining.length) moveColumn();
            }
        });

        return { firstPage, lastPage };
    }

    function addPageNumbers(doc) {
        const totalPages = doc.getNumberOfPages();
        for (let page = 1; page <= totalPages; page += 1) {
            doc.setPage(page);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(7.2);
            doc.setTextColor(...THEME.muted);
            doc.text(`Page ${page} of ${totalPages}`, THEME.pageWidth / 2, THEME.footerY, { align: "center" });
        }
    }

    return {
        theme: THEME,
        setDocumentProperties,
        drawFrame,
        drawCard,
        drawRoundedImage,
        drawText,
        sectionTitle,
        drawRecipePages,
        drawShoppingPages,
        addPageNumbers,
        wrapText,
        fitSingleLineFont
    };
})();
