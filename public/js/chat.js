const socket = io();

const $messageForm = document.getElementById('message-form');
const $messageFormButton = $messageForm.querySelector('button');
const $messageFormInput = $messageForm.querySelector('input');
const $sendLocationButton = document.getElementById("send-location");
const $messages = document.getElementById('messages');

// Message template
const messageTemplate = document.getElementById('message-template').innerHTML;
// Location url template
const urlTemplate = document.getElementById('url-template').innerHTML;
// Sidebar template
const sidebarTemplate = document.getElementById('sidebar-template').innerHTML;

// Options
const { username, room } = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () => {
    // $messages.scrollTop = $messages.scrollHeight
    // New message element
    const $newMessage = $messages.lastElementChild

    // Height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin


    // Visible Height
    const visibleHeight = $messages.offsetHeight

    // Height of messages container, -1 for rounding off purpose if height is in decimal
    const containerHeight = $messages.scrollHeight - 1;

    // How far have I scrolled?
    const scrollOffset = $messages.scrollTop + visibleHeight
    console.log(newMessageMargin, newMessageHeight, visibleHeight, containerHeight, scrollOffset);

    if (containerHeight - newMessageHeight <= scrollOffset) {
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (message) => {
    console.log(message);
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        // moment is date formatting library
        createdAt: moment(message.createdAt).format('hh:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll()
});

socket.on('locationMessage', (locationMsg) => {
    console.log(locationMsg);
    const html = Mustache.render(urlTemplate, {
        username: locationMsg.username,
        url: locationMsg.text,
        createdAt: moment(locationMsg.createdAt).format('hh:mm a')
    });
    $messages.insertAdjacentHTML('beforeend', html);
    autoscroll()
})

socket.on('roomData', (room, users) => {
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html;
})

$messageForm.addEventListener("submit", (e) => {
    // for stopping default refresing of form after submit.
    e.preventDefault();

    // disabling form button so that no multiple clicks can be performed before the clicked message is sent
    $messageFormButton.setAttribute('disabled', 'disabled');

    const message = $messageFormInput.value;

    // third parameter is a callback or acknowledgment.
    socket.emit('sentMessage', message, (error) => {
        // enabling button & clearing input
        $messageFormInput.value = "";
        $messageFormButton.removeAttribute('disabled');
        $messageFormInput.focus();

        if (error) {
            return console.log(error);
        }
        console.log("Message Delivered!");
    });
});

$sendLocationButton.addEventListener('click', () => {

    // disabling sendLocationButton
    $sendLocationButton.setAttribute('disabled', 'disabled');

    // navigator.geolocation return a bool if browser support geolocation or not.
    if (!navigator.geolocation) {
        return alert("Your browser does not support geolocation!");
    }

    navigator.geolocation.getCurrentPosition((position) => {

        // parameters (eventName, positionSent, callBack)
        socket.emit('send-location', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
        }, () => {
            // enabling sendLocationButton
            $sendLocationButton.removeAttribute('disabled');
            console.log("Location Shared!");
        });
    })
})

socket.emit('join', { username, room }, (error) => {
    if (error) {
        alert(error)
        location.href = '/'
    }
});