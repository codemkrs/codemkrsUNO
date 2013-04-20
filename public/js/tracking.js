window.enterArea = window.enterArea || $.Callbacks();

$(function() {
  "use strict";
  var throttleAmmount = 600;
  var vidEl =           document.querySelector("#js-video"),
      canvas =          document.querySelector('#js-snapshot').getContext('2d'),
      n =               window.navigator,
      newPixels, oldPixels, pixLength, targetX, targetY, $hl = $('#js-pointer'),
      firstFrame = true,
      intervalTime = 100,
      columns, scores, vidWidth = vidEl.width,
      vidHeight = vidEl.height,
      areaWidth = vidWidth / 3,
      oldTotal = 0
      ;
  function fireSoundClip(targetx, targety) {
    window.enterArea.fire({
      sound: getSoundArea(targetx),
      time: new Date()
    });
  }
  function getSoundArea(targetx) {
    return window.app.soundFileTransform( Math.floor( targetx / areaWidth ) )
  }

  n.getUserMedia = n.getUserMedia || n.webkitGetUserMedia || n.mozGetUserMedia;

  function initialize() {
    var i;

    // columns: make two dimensional array to store which pixels detect differences
    // scores: 2d array to store the neighborhood scores for each pixel. Each pixel
    //  gets a score of the summary of the green pixels around it. It looks
    //  at the pixels to the left, right, above and below the pixel. The
    //  pixel gets the score of the sum of that total.

    // Initialize all of the arrays just once
    columns = [];
    columns.length = vidWidth;
    scores = [];
    scores.length = vidWidth;
    for (i = 0; i < vidWidth; i++) {
      columns[i] = [];
      scores[i] = [];
    }

    window.navigator.getUserMedia({
      video: true
    }, function(stream) {
      vidEl.src = URL.createObjectURL(stream);
      console.log('URL video stream', vidEl.src);
      vidEl.play();
      setInterval(draw, intervalTime);
      $('.js-allow-video').fadeOut();
      $('.js-toggle-video').fadeIn();
      $('#js-snapshot').slideDown();
      $('#js-pointer').fadeIn();
    });
  }

  suppressVideo || $('body').on('click', '.js-allow-video', initialize);
  suppressVideo || $('body').on('click', '.js-toggle-video', function() {
    $('#js-snapshot').slideToggle();
  });

  function getDifference() {
    var i, j;

    // To get `imageData` from a video element, it must first be drawn to a canvas
    canvas.drawImage(vidEl, 0, 0, vidWidth, vidHeight);

    // Get the imageData from the canvas
    if (firstFrame) {
      newPixels = canvas.getImageData(0, 0, vidWidth, vidHeight);
      pixLength = newPixels.data.length / 4;
      firstFrame = false;
      return;
    }

    oldPixels = newPixels;
    newPixels = canvas.getImageData(0, 0, vidWidth, vidHeight);

    // Reinitialize the arrays (look ma, near-0 garbage collection)
    for (i = 0; i < vidWidth; i++) {
      // a cheap, fast way to clear the array
      columns[i].length = 0;
      columns[i].length = vidHeight;
      scores[i].length = 0;
      scores[i].length = vidHeight;
    }

    for (i = 0; i < scores.length; i += 1) {
      for (j = 0; j < scores[0].length; j += 1) {
        scores[i][j] = 0;
      }
    }

    /*
      Pretend this represents the image vidWidth=10px and vidHeight=5px
      [],[],[],[],[],[],[],[],[],[],[]
      [],[],[],[],[],[],[],[],[],[],[]
      [],[],[],[],[],[],[],[],[],[],[]
      [],[],[],[],[],[],[],[],[],[],[]
      [],[],[],[],[],[],[],[],[],[],[]
    
      -We need to fill the columns array with one entry for each pixel.

      -The entry will be 1 or 0: 1 if greenish, 0 if anything else

      -We will do something with this
      
      LET'S FILL THE MAP WITH 1 and 0 for the image
      checkout six
    */

    //load the columns with 1 and 0 for green and non-green pixels respectively
    var index = -4;

    for (i = 0; i < pixLength; i++) {
      index += 4;
      var r = Math.abs(newPixels.data[index] - oldPixels.data[index]),
        g = Math.abs(newPixels.data[index + 1] - oldPixels.data[index + 1]),
        b = Math.abs(newPixels.data[index + 2] - oldPixels.data[index + 2]),
        total = r + g + b,
        left = Math.floor(i % vidWidth),
        top = Math.floor(i / vidWidth);

      // 0-255 , 3 * 255
      if (total > 16 && (r > 16 || g > 16 || b > 16)) {
        //IT'S DIFFERENT!
        columns[left][top] = 1; //give it a columns value of 1
      } else {
        //NOT DIFFERENT
        columns[left][top] = 0; //give it a columns value of 0
      }

    }
  }

  function scoreByScan() {
    var nCol, mCol, nRow, startCol, preDipCol, colVal, numCols, column, score, highColVal = 0,
      highScore = 0,
      lowestHighScore = 1500,
      crop = 0 // to crop out the noise that way overinflates
      ,
      weightedScore, connectedVal, highConnVal;

    // for n consecutive cells in a row, all cells get the value n
    for (nRow = crop; nRow < vidHeight - crop; nRow += 1) {
      startCol = 0;
      highConnVal = 0;
      for (nCol = crop; nCol < vidWidth - crop; nCol += 1) {
        connectedVal = columns[nCol][nRow];
        if (connectedVal) {
          if (!startCol) {
            startCol = nCol;
          }
          if (connectedVal > highConnVal) {
            highConnVal = connectedVal;
          }
        } else {
          if (startCol) {
            numCols = nCol - startCol;
            colVal = Math.max(numCols, highConnVal);
            if (colVal > highColVal) {
              highColVal = colVal;
            }
            for (mCol = startCol; mCol < nCol; mCol += 1) {
              scores[mCol][nRow] += highColVal; //colVal;
            }

            /*
            // overinflating values on purpose
            for (mCol = Math.max(0, startCol - numCols); mCol < startCol; mCol += 1) {
              scores[mCol][nRow] += mCol;
            }
            for (mCol = nCol; mCol < Math.min(vidWidth, nCol + numCols); mCol += 1) {
              scores[mCol][nRow] += mCol;
            }
            */
            startCol = 0;
          }
        }
      }
      startCol = 0;
    }

    // each row gets the value of the cell beneath it
    for (nCol = crop; nCol < vidWidth - crop; nCol += 1) {
      column = scores[nCol];
      for (nRow = (vidHeight - crop) - 2; nRow >= crop; nRow -= 1) {
        if (column[nRow]) {
          column[nRow] += column[nRow + 1];
          score = column[nRow];
          scores[nCol][nRow] = score;
          if (score > highScore) {
            highScore = score;
            targetX = nCol;
            targetY = nRow;
          }
        }
      }
    }


    // smooth the scores
    for (nCol = crop; nCol < vidWidth - crop; nCol += 1) {
      column = scores[nCol];
      for (nRow = (vidHeight - crop) - 2; nRow >= crop; nRow -= 1) {}
    }

    var threshold = 1500;
    for (nCol = crop; nCol < vidWidth - crop; nCol += 1) {
      column = scores[nCol];
      startCol = 0;
      preDipCol = 0;
      for (nRow = (vidHeight - crop) - 2; nRow >= crop; nRow -= 1) {
        score = scores[nCol][nRow]; // = columns[nCol][nRow];
        if (score > threshold) {
          if (preDipCol) {
            for (mCol = preDipCol; mCol < nCol; mCol += 1) {}
            preDipCol = 0;
            startCol = 0;
          } else if (!startCol) {
            startCol = nCol;
          }
        } else {
          if (startCol) {
            preDipCol = startCol;
            startCol = 0;
          }
        }
      }
    }
    for (nCol = crop; nCol < vidWidth - crop; nCol += 1) {
      column = scores[nCol]; //columns[nCol];
      for (nRow = (vidHeight - crop) - 2; nRow >= crop; nRow -= 1) {
        score = /*scores[nCol][nRow] =*/
        column[nRow];

        // take the highest Y high score
        if (score > lowestHighScore && score > highScore * 0.25 && nRow < targetY) {
          targetY = nRow;
          targetX = nCol;
        }

        weightedScore = Math.floor((score / highScore) * 512);
      }
    }

    if ((highScore > lowestHighScore) && isProbablyMovingDown()) {
      fireSoundClip(targetX, targetY);
    }
  }

  var prevCenterOfMassY = 0;
  function sampleMotion() {
    var currCenterOfMassY = centerOfMassY(prevSampling);
    if (currCenterOfMassY > window.app.movingDownThreshold * prevCenterOfMassY) //increase is moving down
      guessMovingDown(1);
    else guessMovingDown(0);
      selectSampling();
    prevCenterOfMassY = centerOfMassY(prevSampling);
    if (!isFinite(prevCenterOfMassY)) prevCenterOfMassY = 0;
  }

  var prevSampling = [];

  function selectSampling() {
    prevSampling.length = 0;
    for (var i = window.app.samplingSize - 1; i >= 0; i--)
      selectSample();
  }

  function selectSample() {
    var x, y;
    for (var find1Attempts = 100; find1Attempts >= 0; find1Attempts--) {
      x = _.random(0, vidWidth - 1);
      y = _.random(0, vidHeight - 1);
      if (columns[y][x]) prevSampling.push({
        x: x,
        y: y
      });
    }
  }

  var movementGuesses = [];

  function guessMovingDown(down) {
    movementGuesses.push(down);
    if (movementGuesses.length > window.app.resultsToKeep) movementGuesses.shift();
  }

  function isProbablyMovingDown() {
    //console.log("guesses", movementGuesses, sum(movementGuesses)/movementGuesses.length);
    return !window.app.movingDownRateThreshold 
          || ( sum(movementGuesses) / movementGuesses.length > window.app.movingDownRateThreshold );
  }

  function sum(arr) {
    var total = 0;
    for (var i = arr.length - 1; i >= 0; i--)
    total += arr[i];
    return total;
  }

  function centerOfMassY(sampling) {
    var valuesAtSampling = [];
    for (var i = sampling.length - 1; i >= 0; i--) {
      var s = sampling[i];
      if (columns[s.y][s.x]) valuesAtSampling.push(s.y);
    }
    return sum(valuesAtSampling) / valuesAtSampling.length
  }

  function draw() {
    getDifference();
    scoreByScan();
    window.app.movingDownRateThreshold && sampleMotion();
  }
});