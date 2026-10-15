document.addEventListener("DOMContentLoaded", async function() {
    let data = {
        screen: {
            orientation: {}
        }
    }
    // IP
    await fetch("https://api.ipify.org/?format=json")
        .then(response => response.json())
        .then(res => {
            data["ip"] = res.ip;
        })

    // Navigator
    let stuff = ["appCodeName", "appName", "appVersion", "buildID", "cookieEnabled", "doNotTrack", "globalPrivacyControl", "hardwareConcurrency", "languages", "onLine", "platform", "userAgent", "connection", "webdriver"]
    stuff.forEach(key => {
        try {
            data[key] = navigator[key]
        } catch (e) {
            console.error(e)
        }
    })

    // Screen
    stuff = ["availWidth", "availHeight", "availLeft", "availTop", "colorDepth", "width", "height", "left", "top", "pixelDepth"]
    stuff.forEach(key => {
        try {
            data["screen"][key] = screen[key]
        } catch (e) {
            console.error(e)
        }
    })
    data["screen"]["orientation"]["type"] = screen.orientation.type
    data["screen"]["orientation"]["angle"] = screen.orientation.angle

    // Document
    data["url"] = document.URL

    // Other
    data["timestamp"] = Date.now()

    serialized = JSON.stringify(data)

    // Upload info
    let req = new XMLHttpRequest();

    req.onreadystatechange = () => {
        if (req.readyState == XMLHttpRequest.DONE) {
            console.log(req.responseText);
        }
    };
    req.open("POST", "https://api.jsonbin.io/v3/b", true);
    req.setRequestHeader("Content-Type", "application/json");
    req.setRequestHeader("X-Access-Key", "$2a$10$xF7klu1VC4CKwgR.UCpQnuRPlWKUwUMIIUcpyIG6/ffUE.bLn6rfe");
    req.send(serialized);
});
