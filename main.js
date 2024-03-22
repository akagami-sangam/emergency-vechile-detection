$(function () {
  // Select the first video element on the page
  const video = $("video")[0]

  // Initialize variables
  var model
  var cameraMode = "environment"

  //start the video stream from the user's camera
  const startVideoStreamPromise = navigator.mediaDevices
    .getUserMedia({
      audio: false,
      video: {
        facingMode: cameraMode,
      },
    })
    .then(function (stream) {
      return new Promise(function (resolve) {
        // Set the video stream as the source for the video element
        video.srcObject = stream
        video.onloadeddata = function () {
          video.play()
          resolve()
        }
      })
    })

  // API key for Roboflow model
  var publishable_key = "rf_Oway59CiLbekxgOGJ5OTJwqYsWm1"
  var toLoad = {
    model: "ambulance-emergency",
    version: 1,
  }

  //load the machine learning model
  const loadModelPromise = new Promise(function (resolve, reject) {
    roboflow
      .auth({
        publishable_key: publishable_key,
      })
      .load(toLoad)
      .then(function (m) {
        model = m
        resolve()
      })
  })

  // After both promises resolve, remove loading class, resize canvas and start detection
  Promise.all([startVideoStreamPromise, loadModelPromise]).then(function () {
    $("body").removeClass("loading")
    resizeCanvas()
    detectFrame()
  })

  // Initialize variables for canvas and context
  var canvas, ctx
  const font = "16px sans-serif"

  // Function to get dimensions of the video
  function videoDimensions(video) {
    // Ratio of the video's intrinsic dimensions
    var videoRatio = video.videoWidth / video.videoHeight

    // The width and height of the video element
    var width = video.offsetWidth,
      height = video.offsetHeight

    // The ratio of the element's width to its height
    var elementRatio = width / height

    // Adjust width and height to maintain aspect ratio
    if (elementRatio > videoRatio) {
      width = height * videoRatio
    } else {
      height = width / videoRatio
    }

    return {
      width: width,
      height: height,
    }
  }

  // Handle window resize event
  $(window).resize(function () {
    resizeCanvas()
  })

  // Resize canvas according to video dimensions
  const resizeCanvas = function () {
    $("canvas").remove()

    canvas = $("<canvas/>")

    ctx = canvas[0].getContext("2d")

    var dimensions = videoDimensions(video)

    console.log(
      video.videoWidth,
      video.videoHeight,
      video.offsetWidth,
      video.offsetHeight,
      dimensions
    )

    canvas[0].width = video.videoWidth
    canvas[0].height = video.videoHeight

    $("body").append(canvas)
  }

  // Render predictions on canvas
  const renderPredictions = function (predictions) {
    var dimensions = videoDimensions(video)

    var scale = 1

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x
      const y = prediction.bbox.y

      const width = prediction.bbox.width
      const height = prediction.bbox.height

      // Draw bounding box
      ctx.strokeStyle = prediction.color
      ctx.lineWidth = 4
      ctx.strokeRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        width / scale,
        height / scale
      )

      // Draw label background
      ctx.fillStyle = prediction.color
      const textWidth = ctx.measureText(prediction.class).width
      const textHeight = parseInt(font, 10)
      ctx.fillRect(
        (x - width / 2) / scale,
        (y - height / 2) / scale,
        textWidth + 8,
        textHeight + 4
      )
    })

    predictions.forEach(function (prediction) {
      const x = prediction.bbox.x
      const y = prediction.bbox.y

      const width = prediction.bbox.width
      const height = prediction.bbox.height

      // Draw text
      ctx.font = font
      ctx.textBaseline = "top"
      ctx.fillStyle = "#000000"
      ctx.fillText(
        prediction.class,
        (x - width / 2) / scale + 4,
        (y - height / 2) / scale + 1
      )
    })
  }

  // Initialize variables for frame detection
  var prevTime
  var pastFrameTimes = []

  // Function to detect frames
  const detectFrame = function () {
    if (!model) return requestAnimationFrame(detectFrame)

    let redTimer1 = null // Timer to change back to red for light 1
    let redTimer2 = null // Timer to change back to red for light 2
    let redTimer3 = null // Timer to change back to red for light 3
    let redTimer4 = null
    let redTimer6 = null

    model
      .detect(video)
      .then(function (predictions) {
        requestAnimationFrame(detectFrame)
        renderPredictions(predictions)

        // Update detection indicator based on predictions
        const detectedClass = predictions.length > 0 ? predictions[0].class : ""
        updateDetectionIndicator(detectedClass)
        reminder(detectedClass)

        // Function to remind based on detected class
        function reminder(detectedClass) {
          const indicator = document.getElementById("detection-indicator")
          if (detectedClass) {
            indicator.style.backgroundColor = "blue" // Change to blue if a class is detected
          } else {
            indicator.style.backgroundColor = "red" // Otherwise, revert to red
          }
        }

        // Start the timers to change back to red if they are not already started
        if (detectedClass) {
          if (!redTimer1) {
            document.getElementById("light1").style.backgroundColor = "green"
            redTimer1 = setTimeout(() => {
              document.getElementById("light1").style.backgroundColor = "red"
              redTimer1 = null
            }, 10000)
          }
          if (!redTimer2) {
            document.getElementById("light2").style.backgroundColor = "red"
            redTimer2 = setTimeout(() => {
              document.getElementById("light2").style.backgroundColor = "green"
              redTimer2 = null
            }, 15000)
          }
          if (!redTimer3) {
            document.getElementById("light3").style.backgroundColor = "green"
            redTimer3 = setTimeout(() => {
              document.getElementById("light3").style.backgroundColor = "red"
              redTimer3 = null
            }, 20000)
          }
          if (!redTimer4) {
            document.getElementById("light4").style.backgroundColor = "red"
            redTimer2 = setTimeout(() => {
              document.getElementById("light4").style.backgroundColor = "green"
              redTimer2 = null
            }, 15000)
          }
        }

        // Calculate FPS and update display
        if (prevTime) {
          // FPS calculation
        }
        prevTime = Date.now()
      })
      .catch(function (e) {
        console.error("Error detecting frame:", e)
        requestAnimationFrame(detectFrame)
      })

    // Function to update detection indicator
    function updateDetectionIndicator(detectedClass) {
      if (!detectedClass) {
        // Reset all timers if no class is detected
        if (redTimer1) {
          clearTimeout(redTimer1)
          redTimer1 = null
        }
        if (redTimer2) {
          clearTimeout(redTimer2)
          redTimer2 = null
        }
        if (redTimer3) {
          clearTimeout(redTimer3)
          redTimer3 = null
        }
        if (redTimer4) {
          clearTimeout(redTimer3)
          redTimer4 = null
        }
      }
    }
  }
})
