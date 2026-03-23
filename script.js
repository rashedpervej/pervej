const redLight = document.getElementById('red-light');
const yellowLight = document.getElementById('yellow-light');
const greenLight = document.getElementById('green-light');
const trafficLight = document.getElementById('traffic-light');
const toggleButton = document.getElementById('toggle-layout');

let currentLight = 0; // 0 = red, 1 = yellow, 2 = green
let isVertical = true; // Initial layout is vertical

function changeLight() {
    redLight.classList.remove('red');
    yellowLight.classList.remove('yellow');
    greenLight.classList.remove('green');

    if (currentLight === 0) {
        redLight.classList.add('red');
        currentLight = 1;
    } else if (currentLight === 1) {
        yellowLight.classList.add('yellow');
        currentLight = 2;
    } else {
        greenLight.classList.add('green');
        currentLight = 0;
    }
}

function toggleLayout() {
    if (isVertical) {
        trafficLight.style.flexDirection = 'row';
        trafficLight.style.width = '300px';
        trafficLight.style.height = '100px';
        toggleButton.textContent = 'Vertical';
    } else {
        trafficLight.style.flexDirection = 'column';
        trafficLight.style.width = '100px';
        trafficLight.style.height = '300px';
        toggleButton.textContent = 'Horizontal';
    }
    isVertical = !isVertical;
}

toggleButton.addEventListener('click', toggleLayout);

// NOTE: তুমি 350ms দিয়েছো, এটা খুব fast
setInterval(changeLight, 2000);
