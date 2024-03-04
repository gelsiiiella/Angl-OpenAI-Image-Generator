const generateForm = document.querySelector(".generate-form");
const imageGallery = document.querySelector(".image-gallery");
const spinnerContainer = document.querySelector('.spinner-container');
const overlay = document.querySelector('.overlay');

//Sumbmit button function
const handleFormSubmission = async (e) => {
    e.preventDefault();

    overlay.style.display = 'block';
    spinnerContainer.style.display = 'flex';

    const userPrompt = document.querySelector(".prompt-input").value;

    try {
        const response = await fetch("generateAiImages", { 
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ userPrompt }),
        });

        if (!response.ok) {
            throw new Error("Failed to generate images");
        }

        const { images } = await response.json();

        const imgCard = document.createElement("div");
        imgCard.classList.add("img-card");

        const img = document.createElement("img");
        img.src = images[0];
        
//Supposedly, this line of codes shall display the generated images with download button for users to save the image.
        const downloadBtn = document.createElement("a");
        downloadBtn.innerHTML = "&#x2B07";
        downloadBtn.href = images[0];

        imgCard.appendChild(img);
        imgCard.appendChild(downloadBtn);
        imageGallery.appendChild(imgCard);
    } catch (error) {
        console.error('Error generating images:', error);
        alert('Failed to generate images');
    } finally {
        overlay.style.display = 'none';
        spinnerContainer.style.display = 'none';
    }
};

generateForm.addEventListener("submit", handleFormSubmission);

