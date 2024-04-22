let selectedFeatureId = null;
let latestClickedImage = null;
let canvas;


function handleTextForm(formId) {
    const form = document.getElementById(formId);

    form.addEventListener("submit", function(event) {
        event.preventDefault(); 

        const formData = new FormData(event.target);

        const clickedButton = event.submitter;
        if (clickedButton && clickedButton.name) {
            formData.append(clickedButton.name, clickedButton.value);
        }

        fetch(event.target.action, {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': formData.get('csrfmiddlewaretoken'), 
            },
        })
        .then(response => response.json()) 
        .then(data => {
            console.log(data);

            if (Array.isArray(data.matched_features)) {
                const imageSelectionForm = document.getElementById('imageSelectionForm');
                const formContent = document.getElementById('matched_features');
                formContent.innerHTML = '';
                
                data.matched_features.forEach(feature => {
                    formContent.innerHTML += `
                            <label>
                                <input type="radio" name="selected_feature" value="${feature.id}">
                                <img src="${feature.image_url}" alt="Feature Image">
                            </label>
                    `;
                });
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
    });
}

function addSelectedFeature() {
    const form = document.getElementById('imageSelectionForm');
    selectedFeatureId = form.querySelector('input[name="selected_feature"]:checked').value;

    fetch(`/get_feature_details/${selectedFeatureId}/`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            updateSelectedContainer(data.image_url);
        })
        .catch(error => {
            console.error('Error:', error);
        });
}

function handleImageClick(event) {
    latestClickedImage = event.target;
}
function updateSelectedContainer(imageUrl, scalePercentage) {
    const img = new Image();
    img.src = imageUrl;
    img.alt = 'Selected Feature';

    img.onload = function() {
        updateImageSize(img, 200);

        function getHighestZIndex() {
            const images = document.querySelectorAll('img');
            let highestZIndex = 0;
            images.forEach(function (image) {
                const zIndex = parseInt(window.getComputedStyle(image).zIndex);
                if (zIndex > highestZIndex) {
                    highestZIndex = zIndex;
                }
            });
            return highestZIndex;
        }

        img.style.zIndex = getHighestZIndex() + 1;

        interact(img).draggable({
            restrict: {
                restriction: "parent",
                endOnly: true,
                elementRect: { top: 0, left: 0, bottom: 1, right: 1 }
            },
            onstart: function (event) {
                img.style.zIndex = getHighestZIndex() + 1;
            },
            onmove: function (event) {
                const target = event.target;
                const x = (parseFloat(target.getAttribute('data-x')) || 0) + event.dx;
                const y = (parseFloat(target.getAttribute('data-y')) || 0) + event.dy;

                target.style.transform = `translate(${x}px, ${y}px)`;
                target.setAttribute('data-x', x);
                target.setAttribute('data-y', y);

                drawImagesToCanvas();
            },
        });

        interact(img).resizable({
            edges: { left: true, right: true, bottom: true, top: true },
            listeners: {
                move(event) {
                    const img = event.target;

                    img.style.width = `${event.rect.width}px`;
                    img.style.height = `${event.rect.height}px`;
                    img.style.transform = `translate(${event.deltaRect.left}px, ${event.deltaRect.top}px)`;

                    drawImagesToCanvas();
                }
            }
        });

        const selectedContainer = document.querySelector('.selected_container');
        selectedContainer.appendChild(img);

        img.addEventListener('click', handleImageClick);

        const containerRect = selectedContainer.getBoundingClientRect();

        const initialX = (containerRect.width - img.width) / 2;
        const initialY = (containerRect.height - img.height) / 2;
        img.style.position = 'absolute';
        img.style.left = window.scrollX + containerRect.left + initialX + 'px';
        img.style.top = window.scrollY + containerRect.top + initialY + 'px';
    };
}

function updateImageSize(img, scalePercentage) {
    const originalWidth = img.width;
    const originalHeight = img.height;

    const scaledWidth = originalWidth * scalePercentage / 100;
    const scaledHeight = originalHeight * scalePercentage / 100;

    img.style.width = `${scaledWidth}px`;
    img.style.height = `${scaledHeight}px`;
}

function drawImagesToCanvas() {
    canvas = canvas || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const selectedContainer = document.querySelector('.selected_container');
    canvas.width = selectedContainer.offsetWidth;
    canvas.height = selectedContainer.offsetHeight;

    const images = document.querySelectorAll('.selected_container img');

    images.forEach((img) => {
        const rect = img.getBoundingClientRect();
        const scaleX = 0.5; 
        const scaleY = 0.5; 
        const scaledWidth = img.width * scaleX;
        const scaledHeight = img.height * scaleY;
        ctx.drawImage(img, rect.left, rect.top, scaledWidth, scaledHeight);
    });
}

document.addEventListener('DOMContentLoaded', function() {
    document.getElementById('saveImageForm').addEventListener('submit', function(event) {
        event.preventDefault();

        saveCombinedImage();
    });
});

function saveCombinedImage() {
    drawImagesToCanvas();

    const dataURL = canvas.toDataURL();

    const img = new Image();
    img.onload = function() {
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        tempCtx.drawImage(img, 0, 0);

        const trimmedCanvas = trimCanvas(tempCanvas);

        const trimmedDataURL = trimmedCanvas.toDataURL();

        const formData = new FormData();
        formData.append('image', trimmedDataURL);

        const csrftoken = getCookie('csrftoken');
        formData.append('csrfmiddlewaretoken', csrftoken);

        fetch('/save_image/', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRFToken': csrftoken,
            },
        })
        .then(response => response.json())
        .then(data => {
            if (data.image_url) {
                console.log('Image saved:', data.image_url);
                
                // After saving the image, trigger composite_match
                triggerCompositeMatch(dataURL);
            } else {
                console.error('Error saving image:', data.error);
            }
        })
        .catch(error => {
            console.error('Error saving image:', error);
        });
    };
    img.src = dataURL;
}

function triggerCompositeMatch(imageData) {
    fetch('/composite_match/', {
        method: 'POST',
        body: JSON.stringify({ image: imageData }),
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
    })
    .then(response => response.json())
    .then(data => {
        console.log('Composite match result:', data);
        // Handle the response as needed
    })
    .catch(error => {
        console.error('Error triggering composite match:', error);
    });
}
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

function trimCanvas(canvas) {
    const ctx = canvas.getContext('2d');

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = 0;
    let maxY = 0;

    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            const alpha = data[(y * canvas.width + x) * 4 + 3];
            if (alpha > 0) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = width;
    trimmedCanvas.height = height;
    const trimmedCtx = trimmedCanvas.getContext('2d');

    trimmedCtx.drawImage(canvas, minX, minY, width, height, 0, 0, width, height);

    return trimmedCanvas;
}

function deleteSelectedImage() {
    if (latestClickedImage) {
        latestClickedImage.parentNode.removeChild(latestClickedImage);
        latestClickedImage = null; 
    }
}