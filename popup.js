const clearShelfBtn = document.getElementById('clearShelf');
const clearShelfOutput = document.getElementById('clearShelfOutput');

chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(request, sender, sendResponse);
    clearShelfOutput.innerHTML = `<small class='${request.level}'>${request.message}</small>`;
  },
);

clearShelfBtn.addEventListener('click', async () => {
  clearShelfOutput.innerHTML = '';

  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  chrome.scripting.executeScript({
    target: { tabId: tab.id },
    function: clearShelf,
  });
});

async function clearShelf() {
  let deleted = 0;
  let items = document.querySelectorAll('button[aria-label=\'More Options\']');
  if (items.length <= 0) {
    if (deleted > 0) {
      log('All books deleted');
    } else {
      log('No books found', 'error');
    }
    return;
  }

  for (const item of items) {
    item.click();
    await sleep(500);

    try {
      await executeWithRetry(() => {
        document.querySelector('#overflow-delete').click();
      }, 2);
    } catch (e) {
      log('Delete button not found', 'error');
      return;
    }

    await sleep(500);

    try {
      await executeWithRetry(() => {
        document.querySelector('simple-dialog button:nth-of-type(2)').click();
      }, 2);
    } catch (e) {
      log('Dialog confirm delete button not found', 'error');
      return;
    }

    await sleep(2000);
    deleted += 1;
    log(`Deleted ${deleted} book${deleted === 1 ? '' : 's'}`);
  }

  exec();

  async function executeWithRetry(fn, retryCount) {
    if (retryCount < 0) {
      throw new Error('No more retries');
    }
    try {
      fn();
    } catch (e) {
      await sleep(500);
      log('Retrying...');
      this(fn, retryCount - 1, errorFn);
    }
  }

  function log(message, level = 'info') {
    chrome.runtime.sendMessage({ message, level });
  }

  function sleep(ms) {
    return new Promise((res, rej) => {
      try {
        setTimeout(() => {
          res();
        }, ms);
      } catch (er) {
        rej();
      }
    });
  }
}