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
    return window.app.soundFileTransform2( window.app.soundFileTransform( Math.floor( targetx / areaWidth ) ) );
  }

  n.getUserMedia = n.getUserMedia || n.webkitGetUserMedia || n.mozGetUserMedia || (function() { throw "user media not supported" })()

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

    n.getUserMedia({
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
    }, console.error.bind(console));
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

    if ((highScore > lowestHighScore) && (window.app.noUpstrokeCheck || isChangedToUpstroke()) ) {
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

  // when detecting motion
  //  if you are _moving up_ and were _previously_ _moving down_
  //  play sound

  // moving up:
  // The cloud's mean Y is _lower_ than _previous mean Ys_

  // on tick:
  //   calculate mean y of the cloud 
  //   if there is a mean (_enough data points_) enqueue value
  //   else if there _recently_ was a true mean, 
  //      enqueue that mean
  //      record false mean
  //   else zero out queue 


  var recentMeans = []
  function isChangedToUpstroke() {
    if(!isMoving(-1) )
      return false;
    return wasRecentlyMovingDownward();
  }

  function isMoving(direction) {
    return wasMoving(direction, recentMeans.length-1);
  }
  function wasMoving(direction, indexOfItem) {
    var thisMean = recentMeans[indexOfItem].value;
    var mustExceed = direction * window.app.downstrokeFilter.amountDifferentToBeMoving + thisMean;
    var toCompareTo = recentMeans.slice( indexOfItem-window.app.downstrokeFilter.numberToSampleForDeltaToBeMoving-1, indexOfItem);
    var necessaryForConcensus = window.app.downstrokeFilter.numberToSampleForDeltaToBeMoving/2;
    var comparison = direction == -1 ? function(x){ return x.value > mustExceed} : function(x){ return x.value < mustExceed};
    return most(toCompareTo, necessaryForConcensus, comparison);
  }

  function wasRecentlyMovingDownward() {
    var lowerBound = recentMeans.length-window.app.downstrokeFilter.numberToSampleForRecentlyMovingDownward-1;
    if(lowerBound < 0) lowerBound = 0;
    var recentMotion = !recentMeans.length ? [] : _.range(lowerBound, recentMeans.length -1);
    var necessaryForConcensus = window.app.downstrokeFilter.numberToSampleForRecentlyMovingDownward/2;
    return most(recentMotion, necessaryForConcensus, function(x){ return wasMoving(+1, x); });
  }

  function most(arr, necessaryForConcensus, test) {
    var voteExceeded = 0;
    for(var i = 0; i<arr.length;i++) {
      if( test(arr[i]) ) 
        voteExceeded+=1;
      if(voteExceeded >= necessaryForConcensus) 
        return true;     
    }
    return false; 

  }

  function takeCloudTemperature() {
    var mean = calcMeanY();
    if(mean !== null)
      return enqueue(mean, true);
    var recentTrueMean = getRecentTrueMean()
    if(recentTrueMean !== null) {
      return enqueue(recentTrueMean, false);
    }
    recentMeans.length = 0;
  }

  function calcMeanY() {
    var x,y,col,onYs = [];
    for(x=columns.length-1;x>=0;x--){
      col = columns[x];
      for(y=col.length-1;y>=0;y--) {
        if(col[y]){ onYs.push(y); }
      }
    }
    return sum(onYs) / onYs.length;
  }

  function getRecentTrueMean(){
    for(var len = recentMeans.length, i = len-1; i > len-3; i--) {
      if(recentMeans[i].isTrueMean)
        return recentMeans[i].value;
    }
    return null;
  }

  function enqueue(mean, isTrueMean) {
    recentMeans.push({value: mean, isTrueMean: isTrueMean});
    if (recentMeans.length > window.app.downstrokeFilter.recentMeansSize) recentMeans.shift();
  }

  function sum(arr) {
    var total = 0;
    for (var i = arr.length - 1; i >= 0; i--)
    total += arr[i];
    return total;
  }

  function draw() {
    getDifference();
    scoreByScan();
    window.app.noUpstrokeCheck || takeCloudTemperature();
  }
});