async function loadRecipes() {

    const recipeList = document.getElementById("recipeList");

    // If we're not on the Browse Recipes page, do nothing.
    if (!recipeList) return;

    try {

        const response = await fetch("../data/recipes/recipes.json");

        if (!response.ok) {
            throw new Error("Couldn't load recipes.json");
        }

        const recipes = await response.json();

        recipeList.innerHTML = "";

        recipes.forEach(recipe => {

            const card = document.createElement("div");
            card.className = "recipe-card";

            card.innerHTML = `
                <h2>${recipe.name}</h2>

                <p>${recipe.description}</p>

                <p>
                    👥 Serves ${recipe.serves}
                    &nbsp; • &nbsp;
                    ⏱ ${recipe.cookTime} mins
                    &nbsp; • &nbsp;
                    ⭐ ${recipe.difficulty}
                </p>

                <button class="button addButton">
                    + Add to Shopping List
                </button>
            `;

            recipeList.appendChild(card);

        });

    }

    catch(error){

        recipeList.innerHTML = `
            <h2>Oops!</h2>
            <p>${error.message}</p>
        `;

        console.error(error);

    }

}

document.addEventListener("DOMContentLoaded", loadRecipes);