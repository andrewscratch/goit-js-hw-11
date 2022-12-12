
import './css/styles.css';
import PixabayAPIService from './js/fetch-photo';
import { Notify } from 'notiflix';
import SimpleLightbox from 'simplelightbox';
import 'simplelightbox/dist/simple-lightbox.min.css';
import OnlyScroll from 'only-scrollbar';
import InfiniteScroll from 'infinite-scroll';

const pixabayAPIService = new PixabayAPIService();

const OPTIONS_NOTIFICATION = {
  timeout: 4000,
  fontSize: '16px',
};

let timerNotifyEndPhotos = 1;
let timerNotifyErrorFetch = 1;
let timerNotifyCountPhotos = 1;

const refs = {
  formEl: document.querySelector('#search-form'),
  galleryContainer: document.querySelector('.gallery'),
  pointOfInfiniteScroll: document.querySelector('.point-infinite-scroll'),
};

refs.formEl.addEventListener('submit', onSubmit);

/** lazy scrolling */

new OnlyScroll(document.scrollingElement, {
  damping: 0.6,
});

/** infinite scroll */

const optionsScroll = {
  rootMargin: '200px',
};

const onLoadMore = entries => {
  entries.forEach(async entry => {
    if (
      entry.isIntersecting &&
      pixabayAPIService.query !== '' &&
      pixabayAPIService.lengthArrayPhotos >= pixabayAPIService.perPage
    ) {
      pixabayAPIService.incrementPages();
      try {
        await pixabayAPIService.onFetchPhotos().then(onLoadPhotos);
        timerNotifyEndPhotos = 1;
      } catch (error) {
        reachedEndSearch();
      }
    } else if (
      pixabayAPIService.lengthArrayPhotos < pixabayAPIService.perPage &&
      timerNotifyEndPhotos === 1
    ) {
      reachedEndSearch();
      timerNotifyEndPhotos = 2;
      return;
    }
  });
};

const observer = new IntersectionObserver(onLoadMore, optionsScroll);
observer.observe(refs.pointOfInfiniteScroll);

/** function after form submit */

async function onSubmit(evt) {
  evt.preventDefault();
  pixabayAPIService.query = '';
  timerNotifyErrorFetch = 1;
  timerNotifyCountPhotos = 1;
  refs.galleryContainer.innerHTML = '';

  const formData = new FormData(evt.target);
  const searchQuery = formData.get('searchQuery').trim();

  refs.formEl.reset();

  if (!searchQuery || searchQuery.length < 3) {
    Notify.warning(
      'Warning! Search must not be empty and includes more then 2 letters',
      OPTIONS_NOTIFICATION
    );
    return;
  }

  pixabayAPIService.setNewQuery = searchQuery;
  pixabayAPIService.resetPage();
  await pixabayAPIService.onFetchPhotos().then(onLoadPhotos).catch(onError);
}

/** function for starting of photo loading */

function onLoadPhotos(response) {
  const totalHits = response.data.totalHits;

  if (totalHits === 0 && timerNotifyErrorFetch === 1) {
    Notify.failure(
      'Sorry, there are no images matching your search query. Please try again',
      OPTIONS_NOTIFICATION
    );
    timerNotifyErrorFetch = 2;
    return;
  }

  if (totalHits !== 0 && timerNotifyCountPhotos === 1) {
    Notify.success(
      `Hooray! We found ${totalHits} images`,
      OPTIONS_NOTIFICATION
    );
    timerNotifyCountPhotos = 2;
  }

  const photos = response.data.hits;
  onMarkupPhotos(photos);
  onSimpleLightBox();
}

function onMarkupPhotos(photos) {
  const markupPhotos = photos
    .map(
      ({
        webformatURL,
        largeImageURL,
        tags,
        likes,
        views,
        comments,
        downloads,
      }) => {
        return `<div class="photo-card">
              <a href="${largeImageURL}"> 
                <img src="${webformatURL}" alt="${tags}" loading="lazy" />
              </a>
              <div class="info">
                <p class="info-item">
                  <b>Likes: </b>${likes}
                </p>
                <p class="info-item">
                  <b>Views: </b>${views}
                </p>
                <p class="info-item">
                  <b>Comments: </b>${comments}
                </p>
                <p class="info-item">
                  <b>Downloads: </b>${downloads}
                </p>
              </div>
      </div>`;
      }
    )
    .join('');

  refs.galleryContainer.insertAdjacentHTML('beforeend', markupPhotos);
}

function onError(error) {
  if (error.response) {
    Notify.failure(
      `Sorry, an error occurred - ${error.response.status}. Try again`,
      OPTIONS_NOTIFICATION
    );
  } else if (error.request) {
    Notify.failure(
      'Sorry, the request was made, but no response was received. Try again',
      OPTIONS_NOTIFICATION
    );
  } else {
    Notify.failure(
      'Something happened in setting up the request that triggered an Error. Try again',
      OPTIONS_NOTIFICATION
    );
  }
}

function onSimpleLightBox() {
  new SimpleLightbox('.gallery a', {
    captionsData: 'alt',
    captionDelay: 250,
  });
}

function reachedEndSearch() {
  Notify.warning(
    `We're sorry, but you've reached the end of search "${pixabayAPIService.getCurrentQuery.toUpperCase()}". Please start a new search`,
    {
      timeout: 5000,
      position: 'center-center',
      fontSize: '20px',
      width: '320px',
    }
  );
}