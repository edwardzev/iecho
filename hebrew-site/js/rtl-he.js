(function ($) {
  'use strict';

  function isRtlDocument() {
    return document.documentElement.getAttribute('dir') === 'rtl';
  }

  function buildRtlSlickOptions() {
    return {
      variableWidth: true,
      infinite: true,
      centerPadding: '60px',
      slidesToShow: 3,
      slidesToScroll: 1,
      dots: false,
      arrows: false,
      touchThreshold: 100,
      lazyLoad: 'ondemand',
      autoplay: true,
      autoplaySpeed: 4500,
      pauseOnFocus: true,
      pauseOnHover: true,
      draggable: true,
      rtl: true,
      responsive: [
        {
          breakpoint: 1620,
          settings: {
            arrows: false,
            centerPadding: '40px',
            slidesToShow: 2
          }
        },
        {
          breakpoint: 768,
          settings: {
            arrows: false,
            centerPadding: '40px',
            slidesToShow: 2
          }
        },
        {
          breakpoint: 480,
          settings: {
            arrows: false,
            centerPadding: '10px',
            slidesToShow: 1
          }
        }
      ]
    };
  }

  $(function () {
    if (!isRtlDocument() || typeof $.fn.slick !== 'function') {
      return;
    }

    var rtlOptions = buildRtlSlickOptions();

    $('.iecho-slick1').each(function () {
      var $slider = $(this);

      if ($slider.hasClass('slick-initialized')) {
        $slider.slick('unslick');
      }

      $slider.slick(rtlOptions);
    });
  });
})(jQuery);
