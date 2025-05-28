addEventListener('push', event => {
    console.log(event);
    let data = JSON.parse(event.data.text());
    registration.showNotification(data.notification.title, data.notification);
})