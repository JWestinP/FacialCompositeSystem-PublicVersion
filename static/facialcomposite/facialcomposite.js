let selectedFeatureId = null;
let latestClickedImage;
let canvas;
const MAX_WIDTH = 900; 
const MAX_HEIGHT = 700;

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
                            <label class="feature-label">
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

                adjustImagePosition(target); 
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

                    adjustImagePosition(img); 
                    drawImagesToCanvas();
                }
            }
        });

        const selectedContainer = document.querySelector('.selected_container');
        selectedContainer.appendChild(img);

        img.addEventListener('click', handleImageClick);

        if (selectedContainer.offsetWidth > MAX_WIDTH) {
            selectedContainer.style.width = MAX_WIDTH + 'px';
        }
        if (selectedContainer.offsetHeight > MAX_HEIGHT) {
            selectedContainer.style.height = MAX_HEIGHT + 'px';
        }
        
        adjustImagePosition(img); 
        drawImagesToCanvas();
    };
}

function updateImageSize(img, scalePercentage) {
    const originalWidth = img.width;
    const originalHeight = img.height;

    const scaledWidth = originalWidth * scalePercentage / 100;
    const scaledHeight = originalHeight * scalePercentage / 100;

    img.width = scaledWidth;
    img.height = scaledHeight;
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
        const posX = parseFloat(img.style.left);
        const posY = parseFloat(img.style.top);
        ctx.drawImage(img, posX, posY, rect.width, rect.height);
    });
}

function adjustImagePosition(img) {
    const containerRect = img.parentElement.getBoundingClientRect(); 
    const imgRect = img.getBoundingClientRect(); 

    const newX = imgRect.left - containerRect.left;
    const newY = imgRect.top - containerRect.top;

    img.style.left = newX + 'px';
    img.style.top = newY + 'px';
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

        
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;

        tempCtx.drawImage(canvas, 0, 0);

        const trimmedCanvas = trimCanvas(tempCanvas);

        const trimmedDataURL = trimmedCanvas.toDataURL();

        saveImage(trimmedDataURL);
    };

    img.src = dataURL;
}

function saveImage(dataURL) {
    showInitiationPopup();

    const formData = new FormData();
    formData.append('image', dataURL);

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
            triggerCompositeMatch(data.image_url);
        } else {
            console.error('Error saving image:', data.error);
        }
    })
    .catch(error => {
        console.error('Error saving image:', error);
    });
}

function triggerCompositeMatch(imagePath) {
    fetch('/composite_match/', {
        method: 'POST',
        body: JSON.stringify({ image_path: imagePath }),
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
    })
    .then(response => {
        showCompletionPopup();
    })
    .catch(error => {
        console.error('Error triggering composite match:', error);
    });
}

function showInitiationPopup() {
    const initiationWidget = document.getElementById('initiation_widget');
    initiationWidget.style.display = 'block';
    initiationWidget.style.opacity = 1;
}

function hideInitiationPopup() {
    const initiationWidget = document.getElementById('initiation_widget');
    initiationWidget.style.display = 'none';
}

function showCompletionPopup() {
    hideInitiationPopup(); 

    const completionWidget = document.getElementById('completion_widget');
    completionWidget.style.display = 'block';
    completionWidget.style.opacity = 1;

    setTimeout(() => {
        completionWidget.style.display = 'none';
    }, 10000);
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

function showProfile(profile_pk){
    console.log('Sending request for user with id:', profile_pk)

    var xhr = new XMLHttpRequest()
    xhr.open('GET', '/get_profile/?profile_id=' + encodeURIComponent(profile_pk), true)
    xhr.send()

    xhr.onload = function(){
        console.log('Response received:', xhr.responseText)
        if (xhr.status != 200) {
            console.error('Error ' + xhr.status + ': ' + xhr.statusText)
        } 
        else {
            try {
                var response = JSON.parse(xhr.responseText);
                if (response && response.profile) {
                    var profile = response.profile;
                
                    var profileName = profile.criminal_name;
                    var profileCrime = profile.criminal_crime;
                    var profileAge = profile.criminal_age;
                    var profileMugshot = profile.criminal_mugshot;
                    var mugshotUrl = `${profileMugshot}`;

                    document.getElementById('profile_div').innerHTML = `
                        <img src="${mugshotUrl}" alt="Profile Mugshot">    
                        <p class="profile_name">Name: ${profileName}</p>
                        <p class="profile_age">Age: ${profileAge}</p>
                        <p class="profile_crime">Crime: ${profileCrime}</p>
                        
                    `;
                } else {
                    console.error('User data not found in the response');
                }
            }
            catch (error) {
                console.error('Error parsing JSON:', error)
            }
        }
    }
}

let pageFirstLoad = true;

function displayError(errorMessage) {
    const errorWidget = document.getElementById('error_widget');
    errorWidget.textContent = errorMessage;
    errorWidget.style.display = 'block';
    setTimeout(() => {
        errorWidget.style.display = 'none';
    }, 5000);
}

function handleErrorResponse(response) {
    if (!response.ok) {
        response.json().then(data => {
            const errorMessage = data.error || 'Unknown error occurred.';
            displayError(errorMessage);
        });
        return Promise.reject(new Error('Response error'));
    }
    return response;
}

function fetchData(url) {
    if (pageFirstLoad) {
        return;
    }

    fetch(url)
        .then(handleErrorResponse) 
        .then(response => response.json()) 
        .then(data => {
            console.log(data);
        })
        .catch(error => {
            console.error('Fetch error:', error);
        });
}

const apiUrls = [
    '/facialcomposite',
    '/chosen_features',
    '/composite_match/',
    '/composite_match_result/',
    '/database_feature_extract/',
    '/save_image/',
    '/get_profile/'
];

setTimeout(() => {
    pageFirstLoad = false;
}, 1000);

apiUrls.forEach(url => {
    fetchData(url);
});
