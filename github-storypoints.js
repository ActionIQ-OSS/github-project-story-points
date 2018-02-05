(function (d, w) {
'use strict';

//var pointsRegEx = /^(\(([\d\.]+)\)\s*)?(.+?)(\s*\[([\d\.]+)\])?$/im; // new RegExp("^(\(([\d\.]+)\))?(.+)(\[([\d\.]+)\])?$", "i"); // Was: /^\(([\d\.]+)\)(.+)/i; 
var pointsRegEx = /^(.+?)(\s*\[([\d\.]+)\])?(\(([\d\.]+)\)\s*)?$/im;

var debounce = function (func, wait, immediate) {
  var timeout;
  return function() {
    var context = this, args = arguments;
    var later = function() {
      timeout = null;
      if (!immediate) func.apply(context, args);
    };
    var callNow = immediate && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(context, args);
  };
};

var pluralize = (value) => (
  value === 1 ? '' : 's'
);

var resetStoryPointsForColumn = (column) => {
  const customElements = Array.from(column.getElementsByClassName('github-project-story-points'));
  for (let e of customElements) {
    const parent = e.parentNode;
    if (parent.dataset.gpspOriginalContent) {
      parent.innerText = parent.dataset.gpspOriginalContent;
      delete parent.dataset.gpspOriginalContent;
    } else {
      parent.removeChild(e);
    }
  }
};

var titleWithPoints = (title, points) => (
  `<span class="github-project-story-points Counter">${points} </span>&nbsp;<span style="font-weight:bold">${title}</span>`
);

var titleWithTotalPoints = (title, points) => (
    `${title}<span class="github-project-story-points" style="font-size:xx-small"> item${pluralize(title)} (${points} ${points == 1 ? "point" : "points"})</span>`
);

var addStoryPointsForColumn = (column) => {
  const columnCards = Array
    .from(column.getElementsByClassName('issue-card'))
    .filter(card => !card.classList.contains('sortable-ghost'))
    .filter(card => !card.classList.contains('d-none'))
    .map(card => {
      const titleElementContainer = Array
        .from(card.getElementsByClassName('h5'))
        .concat(Array.from(card.getElementsByTagName('p')))[0];
      const titleElementLink = (
        titleElementContainer.getElementsByTagName &&
        titleElementContainer.getElementsByTagName('a') ||
        []
      );
      const titleElement = (
        titleElementLink.length > 0
        ? titleElementLink[0]
        : titleElementContainer
      );
      const title = titleElementContainer.innerText;
      const story = (
        pointsRegEx.exec(titleElement.innerText) ||
        [null, '0', titleElement.innerText]
      );
      const storyPoints = parseFloat(story[5]) || 0;
      const storyTitle = story[1].trim();
      return {
        element: card,
        titleElement,
        title,
        titleNoPoints: storyTitle,
        storyPoints,
      };
    });
  const columnCountElement = column.getElementsByClassName('js-column-card-count')[0];

  let columnStoryPoints = 0;
  let columnSpentPoints = 0;
  for (let card of columnCards) {
    columnStoryPoints += card.storyPoints;
    if (card.storyPoints) {
      card.titleElement.dataset.gpspOriginalContent = card.title;
      card.titleElement.innerHTML = titleWithPoints(card.titleNoPoints, card.storyPoints);
    }
    card.titleElement.removeEventListener('contextmenu', openCard);
    card.titleElement.addEventListener('contextmenu', openCard, true);
  }
  // Apply DOM changes:
  if (columnStoryPoints || columnSpentPoints) {
    columnCountElement.innerHTML = titleWithTotalPoints(columnCards.length, columnStoryPoints, columnSpentPoints);
  }
};

var resets = [];

var start = debounce(() => {
  // Reset
  for (let reset of resets) {
    reset();
  }
  resets = [];
  // Projects
  const projects = d.getElementsByClassName('project-columns-container');
  if (projects.length > 0) {
    const project = projects[0];
    const columns = Array.from(project.getElementsByClassName('js-project-column')); // Was 'col-project-custom', but that's gitenterprise; github.com is 'project-column', fortunately, both have 'js-project-column'
    for (let column of columns) {
      const addStoryPoints = ((c) => debounce(() => {
        resetStoryPointsForColumn(c);
        addStoryPointsForColumn(c);
      }, 50))(column);
      column.addEventListener('DOMSubtreeModified', addStoryPoints);
      column.addEventListener('drop', addStoryPoints);
      addStoryPointsForColumn(column);
      resets.push(((c) => () => {
        resetStoryPointsForColumn(c);
        column.removeEventListener('DOMSubtreeModified', addStoryPoints);
        column.removeEventListener('drop', addStoryPoints);
      })(column));
    }
  }
  // Issues
  const issues = Array.from(d.getElementsByClassName('js-issue-row'));
  for (let issue of issues) {
    const titleElement = issue.getElementsByClassName('h4')[0];
    const story = (
      pointsRegEx.exec(titleElement.innerText) ||
      [null, '0', titleElement.innerText]
    );
    const storyPoints = parseFloat(story[5]) || 0;
    const storyTitle = story[3];
    if (storyPoints) {
      titleElement.innerHTML = titleWithPoints(storyTitle, storyPoints);
    }
  }
}, 50);

var httpGetAsync = (theUrl, callback) => {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() { 
        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
            callback(xmlHttp.responseText);
    }
    xmlHttp.open("GET", theUrl, true); // true for asynchronous 
    xmlHttp.send(null);
}

var openCard = event => {
  const url = event.srcElement.parentNode.href;

  document.body.innerHTML +=
    `<div id="githubframewrapper"
        style="width: 100%; height: 100%; top: 0; margin: 0 auto; position: absolute; background: rgba(0,0,0,.4); z-index: 100; padding: 1% 3%; overflow:scroll;">
      <div id="githubframe" style="background: #fff; overflow: scroll; max-width: 1040px; margin: 0 auto; border-radius: 5px; padding: 15px 5px;">
        <h1 style="text-align: center; margin: 2em 0;">Loading...</h1>
      </div>
    </div>`;

  const wrapper = document.getElementById("githubframewrapper");

  wrapper.addEventListener("click", e => {
    if(e.target.id == "githubframewrapper") {
      document.body.removeChild(wrapper);
    }
  });


  httpGetAsync(url, res => {
    var frame = document.getElementById("githubframe");
    if (frame) {
      var githubFrame = document.getElementById("githubframe");
      githubFrame.innerHTML = res;
      
      var header = githubFrame.getElementsByClassName("js-header-wrapper")[0];
      var navigation = githubFrame.getElementsByClassName("repohead")[0];
      
      header.parentNode.removeChild(header);
      navigation.parentNode.removeChild(navigation);
    }
  });

  event.preventDefault();
  return false;
};

// Hacks to restart the plugin on pushState change
w.addEventListener('statechange', () => setTimeout(() => {
  const timelines = d.getElementsByClassName('new-discussion-timeline');
  if (timelines.length > 0) {
    const timeline = timelines[0];
    const startOnce = () => {
      timeline.removeEventListener('DOMSubtreeModified', startOnce);
      start();
    };
    timeline.addEventListener('DOMSubtreeModified', startOnce);
  }
  start();
}, 500));

// First start
start();

})(document, window);
  