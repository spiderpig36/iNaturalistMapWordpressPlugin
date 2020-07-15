/* eslint-disable */

var inatTaxonMap = { };

(function($) {
 jQuery.fn.taxonMap = function( options ) {
    options = options || { }
   jQuery(this).each( function( ) {
      if ( options == 'fit' ) {
        inatTaxonMap.fit( this );
      } else {
        inatTaxonMap.setup( this, options );
      }
    });
  }
}(jQuery))

inatTaxonMap.setup = function ( elt, options ) {
  var options =jQuery.extend( true, { }, options );
  options.latitude = options.latitude || jQuery(elt).data('latitude');
  options.longitude = options.longitude || jQuery(elt).data('longitude');
  options.mapType = options.mapType || jQuery(elt).data('map-type');
  options.mapStyle = options.mapStyle || jQuery(elt).data('map-style');
  options.zoomLevel = options.zoomLevel || parseInt( jQuery(elt).data('zoom-level') );
  options.minZoom = options.minZoom || parseInt( jQuery(elt).data('min-zoom') );
  options.urlCoords = options.urlCoords || jQuery(elt).data('url-coords');
  options.disableFullscreen = ((options.disableFullscreen || jQuery(elt).data('disable-fullscreen')) === true);
  options.showRange = options.showRange || jQuery(elt).data('show-range');
  options.minX = options.minX || jQuery(elt).data('min-x');
  options.minY = options.minY || jQuery(elt).data('min-y');
  options.maxX = options.maxX || jQuery(elt).data('max-x');
  options.maxY = options.maxY || jQuery(elt).data('max-y');
  options.flagLetters = jQuery(elt).data('flag-letters');
  options.observations = options.observations || jQuery(elt).data('observations');
  options.observationLayers = options.observationLayers || jQuery(elt).data('observation-layers');
  options.placeLayers = options.placeLayers || jQuery(elt).data('place-layers');
  options.taxonLayers = options.taxonLayers || jQuery(elt).data('taxon-layers');
  options.mapTypeControl = (options.mapTypeControl !== false && jQuery(elt).data('map-type-control') !== true);
  options.mapTypeControlOptions = options.mapTypeControlOptions || jQuery(elt).data('map-type-control-options');
  options.zoomControl = (options.zoomControl !== false && jQuery(elt).data('zoom-control') !== false);
  options.scrollwheel = (options.scrollwheel !== false && jQuery(elt).data('scrollwheel') !== false);
  options.overlayMenu = (options.overlayMenu !== false && jQuery(elt).data('overlay-menu') !== false);
  options.enableShowAllLayer = (options.enableShowAllLayer !== false && jQuery(elt).data('enable-show-all-layer') !== false);
  options.showAllLayer = options.showAllLayer != null ? options.showAllLayer : jQuery(elt).data('show-all-layer');
  options.featuredLayerLabel = options.featuredLayerLabel || jQuery(elt).data('featured-layer-label') || I18n.t("maps.overlays.featured_observations");
  options.featuredLayerDescription = options.featuredLayerDescription || jQuery(elt).data('featured-layer-description');
  options.placeLayerLabel = options.placeLayerLabel || jQuery(elt).data('place-layer-label');
  options.placeLayerDescription = options.placeLayerDescription || jQuery(elt).data('place-layer-description');
  options.taxonRangeLayerLabel = options.taxonRangeLayerLabel || jQuery(elt).data('taxon-range-layer-label') || I18n.t("maps.overlays.range");
  options.taxonRangeLayerDescription = options.taxonRangeLayerDescription || jQuery(elt).data('taxon-range-layer-description');
  options.taxonPlacesLayerLabel = options.taxonPlacesLayerLabel || jQuery(elt).data('taxon-places-layer-label') || I18n.t("maps.overlays.checklist_places");
  options.taxonPlacesLayerDescription = options.taxonPlacesLayerDescription || jQuery(elt).data('taxon-places-layer-description');
  options.taxonPlacesLayerHover = options.taxonPlacesLayerHover || jQuery(elt).data('taxon-places-layer-hover') || I18n.t("maps.overlays.checklist_places_description");
  options.taxonObservationsLayerLabel = options.taxonObservationsLayerLabel || jQuery(elt).data('taxon-observations-layer-label') || I18n.t("maps.overlays.observations");
  options.taxonObservationsLayerDescription = options.taxonObservationsLayerDescription || jQuery(elt).data('taxon-observations-layer-description');  
  options.allLayerLabel = options.allLayerLabel || jQuery(elt).data('all-layer-label') || I18n.t('maps.overlays.all_observations');
  options.allLayerDescription = options.allLayerDescription || jQuery(elt).data('all-layer-description') || I18n.t("maps.overlays.every_publicly_visible_observation");
  options.gbifLayerLabel = options.gbifLayerLabel || jQuery(elt).data('gbif-layer-label') || I18n.t('gbif_occurrences');
  options.gbifLayerDescription = options.gbifLayerDescription || jQuery(elt).data('gbif-layer-description');
  options.gbifLayerHover = options.gbifLayerHover || jQuery(elt).data('gbif-layer-hover') || I18n.t("maps.overlays.gbif_network_description");
  options.controlPosition = options.controlPosition ||jQuery(elt).data('control-position');
  options.elastic_params = options.elastic_params ||jQuery(elt).data('elastic-params');
  options.gestureHandling = options.gestureHandling ||jQuery( elt ).data( "gesture-handling" );
  options.tilt = options.tilt ||jQuery( elt ).data( "tilt" ) || 0;
  options.currentUser = options.currentUser ||jQuery( elt ).data( "current-user" );
  if ( typeof( CURRENT_USER ) === "object" ) {
    options.currentUser = options.currentUser || CURRENT_USER;
  }
  // turn the observations JSON into proper JavaScript objects
  if ( options.observations ) {
    options.observations = window.lodash.map( options.observations, function( observation ) {
      if ( typeof( observation) === "string" ) {
        return jQuery.parseJSON( observation );
      }
      return window.lodash.assignIn( {}, observation );
    });
  }
  if (options.zoomLevel === 0) {
    options.zoomLevel = null;
  }
  if( !options.showAllLayer && options.showAllLayer !== false ) {
    options.showAllLayer = true;
  }
 jQuery(elt).data('taxonMapOptions',jQuery.extend( true, { }, options ) );
  inatTaxonMap.setupGoogleMap( elt );
};

inatTaxonMap.fit = function( elt ) {
  inatTaxonMap.fitGoogle( elt );
};

inatTaxonMap.setupGoogleMap = function( elt ) {
  var options =jQuery(elt).data('taxonMapOptions');
  var map,
      mapOptions =jQuery.extend( true, { }, {
        mapTypeControl: (options.mapTypeControl !== false),
        mapTypeControlOptions: options.mapTypeControlOptions,
        minZoom: options.minZoom,
        backgroundColor: '#E3EAF6',
        zoomControl: (options.zoomControl !== false),
        zoomControlOptions: options.zoomControlOptions,
        scrollwheel: (options.scrollwheel !== false),
        gestureHandling: options.gestureHandling,
        tilt: options.tilt,
        styles: [
          {
            stylers: [
              {lightness: 50},
              {saturation: -50}
            ]
          }
        ]
      } );
  if (jQuery(elt).data('taxonMap') ) {
    map =jQuery(elt).data('taxonMap');
    map.setOptions( mapOptions );
  } else {
    map = iNaturalist.Map.createMap(jQuery.extend( true, { }, mapOptions, {
      div: elt,
      disableFullscreen: true,
      fullscreenControl: !options.disableFullscreen
    } ) );
  }

  var preserveViewport = options.preserveViewport
  if ( options.minX ) {
    // Google really doesn't like 90 deg latitude all of a sudden
    var minY = Math.max( options.minY || 0, -89 );
    var maxY = Math.min( options.maxY || 0, 89 );
    map.fitBounds(
      new google.maps.LatLngBounds(
        new google.maps.LatLng( minY, options.minX || 0 ),
        new google.maps.LatLng( maxY, options.maxX || 0 )
      )
    )
    preserveViewport = true;
  } else {
    if (options.latitude || options.longitude) {
      map.setCenter(new google.maps.LatLng(options.latitude || 0, options.longitude || 0))
      preserveViewport = true;
    }
    if (options.zoomLevel) {
      map.setZoom(options.zoomLevel)
    }
  }

  // // Create the custom control (but don't show it yet)
  // if( options.overlayMenu && !map._overlayControl) {
    // map._overlayControl = new iNaturalist.OverlayControl(map);
  // }

  // Set custom map type
  if ( options.mapType ) {
    map.setMapTypeId( options.mapType )
  } else if ( options.currentUser || typeof( CURRENT_USER ) === "object" ) {
    var preferredMapTypeId = iNaturalist.Map.preferredMapTypeId( options.currentUser || CURRENT_USER );
    if ( map.getMapTypeId( ) !== preferredMapTypeId ) {
      map.setMapTypeId( preferredMapTypeId );
    }
  }

  if ( !map.mapTypeListener ) {
    function setMapTypeAndUpdateSession( ) {
      if ( options.updateCurrentUser ) {
        options.updateCurrentUser( { preferred_observations_search_map_type: this.getMapTypeId( ) } );
      } else {
        updateSession( { preferred_observations_search_map_type: this.getMapTypeId( ) } );
      }
    }
    // map.mapTypeListener = google.maps.event.addListener( map, "maptypeid_changed", setMapTypeAndUpdateSession );
  }

  // if( options.showLegend && !map._legend ) {
    // // Create the DIV to hold the control and call the CenterControl() constructor
    // // passing in this DIV.
    // var legendControlDiv = document.createElement('div');
    // var legendControl = new iNaturalist.LegendControl(legendControlDiv, map);
    // map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legendControlDiv);

    // // Create the DIV to hold the control and call the CenterControl() constructor
    // // passing in this DIV.
    // var legendDiv = document.createElement('div');
    // map._legend = new iNaturalist.Legend(legendDiv, map);
    // map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(legendDiv);
  // }

  // Clear out all existing overlays so we can add new ones
  map.removeAllLayers( );
  if ( map._overlayControl ) {
    map._overlayControl.removeAll( );
  }
  map.removeObservations( );
  delete map.taxonLayerSignatures;

  // All Observations layer
  if( options.showAllLayer ) {
    if( ! window.lodash.isObject( options.showAllLayer ) ) {
      options.showAllLayer = { }
    }
    map.addObservationsLayer(options.allLayerLabel, window.lodash.defaults( options.showAllLayer, {
      description: options.allLayerDescription,
      disabled: options.enableShowAllLayer === false,
      controlPosition: options.controlPosition,
      mapStyle: options.mapStyle || "summary",
      ttl: 60 * 60 * 24  // 24 hours
    }));
  }
  // these are taxon ranges, listed_taxa places, and taxon-filtered observations
  inatTaxonMap.addTaxonLayers( map, options );
  // these are single place polygons
  inatTaxonMap.addPlaceLayers( map, options );
  // these are the grid/point observation layers
  inatTaxonMap.addObservationLayers( map, options );
  // these are the observations that need Google Maps-style flags
  inatTaxonMap.addObservationsToMap( map, options, preserveViewport);
  var coord;
  if ( options.urlCoords && !map.setUrlHashCoordDragendListener ) {
    function setUrlHashCoord() {
      var coords = window.map.getCenter(),
          x = preciseRound(coords.lng(), 3),
          y = preciseRound(coords.lat(), 3),
          z = window.map.getZoom();
      var baseUrl = window.location.href.split('#')[0];
      window.location.replace( baseUrl +'#' + [z,y,x].join('/') );
    }
    function getUrlHashCoord() {
      var bits = window.location.hash.split('/').map(function(x) { return parseFloat(x.replace(/[^0-9\-\.]/, ''))});
      return { lat: bits[1], lng: bits[2], zoom: bits[0] };
    }
    map.setUrlHashCoordDragendListener = google.maps.event.addListener(map, 'dragend', setUrlHashCoord);
    map.setUrlHashCoordZoomChangedListener = google.maps.event.addListener(map, 'zoom_changed', setUrlHashCoord);
    var coord = getUrlHashCoord();
    if (coord.lat) {
      setTimeout(function() {
        window.map.setCenter(new google.maps.LatLng(coord.lat,coord.lng));
        window.map.setZoom(coord.zoom);
      }, 100);
      preserveViewport = true;
    }
  }
  if ( options.onZoomChanged ) {
    map.onZoomChagedListener = google.maps.event.addListener( map, "zoom_changed", function( e ) {
      options.onZoomChanged( e, map );
    } );
  }
  if( !preserveViewport ) {
    inatTaxonMap.fit( elt )
  }
  // Now apply the custom map to the element
 jQuery(elt).data('taxonMap', map)
};

inatTaxonMap.addTaxonLayers = function( map, options ) {
  if( !options.taxonLayers ) { return; }
  window.lodash.each( options.taxonLayers, function( layer ) {
    if( !( layer.taxon && layer.taxon.id ) ) { return; }
    map.taxonLayerSignatures = map.taxonLayerSignatures || {};
    var sig = JSON.stringify( layer );
    if ( map.taxonLayerSignatures[sig] ) {
      return;
    }
   jQuery.getJSON( "https://api.inaturalist.org/v1/taxa/" + layer.taxon.id + "/map_layers", function( taxonData ) {
      inatTaxonMap.addTaxonLayer( map, layer, options, taxonData );
    });
  });
};

inatTaxonMap.addTaxonLayer = function( map, layer, options, taxonData ) {
  map.taxonLayerSignatures = map.taxonLayerSignatures || {};
  var sig = JSON.stringify( layer );
  if ( map.taxonLayerSignatures[sig] ) {
    return;
  }
  map.taxonLayerSignatures[sig] = true;
  if( layer.places && layer.taxon && taxonData.listed_places ) {
    var layerOptions = window.lodash.isObject( layer.places ) ?
      layer.places : { };
    map.addTaxonPlacesLayer( window.lodash.defaults( layerOptions, {
      taxon: layer.taxon,
      title: options.taxonPlacesLayerLabel,
      description: options.taxonPlacesLayerDescription,
      hover: options.taxonPlacesLayerHover,
      controlPosition: options.controlPosition
    }));
  }
  if( layer.ranges && taxonData.ranges ) {
    var layerOptions = window.lodash.isObject( layer.ranges ) ?
      layer.ranges : { };
    map.addTaxonRangeLayer( window.lodash.defaults( layerOptions, {
      taxon: layer.taxon,
      title: options.taxonRangeLayerLabel,
      description: options.taxonRangeLayerDescription,
      hover: options.taxonRangeLayerHover,
      controlPosition: options.controlPosition
    }));
  }
  if( layer.observations ) {
    var layerOptions = window.lodash.isObject( layer.observations ) ?
      layer.observations : { };
    map.addObservationsLayer( options.taxonObservationsLayerLabel, window.lodash.defaults( layerOptions, {
      taxon: layer.taxon,
      description: options.taxonObservationsLayerDescription,
      hover: options.taxonObservationsLayerHover,
      controlPosition: options.controlPosition,
      mapStyle: options.mapStyle
    } ) );
  }
  if ( layer.observationLayers ) {
    window.lodash.forEach( layer.observationLayers, function( lyr ) {
      map.addObservationsLayer( lyr.label || options.taxonObservationsLayerLabel, window.lodash.defaults( lyr, {
        taxon: layer.taxon,
        description: options.taxonObservationsLayerDescription,
        hover: options.taxonObservationsLayerHover,
        controlPosition: options.controlPosition,
        mapStyle: options.mapStyle
      } ) );
    } );
  }
  if( layer.gbif && taxonData.gbif_id ) {
    layerOptions = window.lodash.isObject( layer.gbif ) ? layer.gbif : { };
    map.addGBIFLayer( window.lodash.defaults( layerOptions, {
      taxon: layer.taxon,
      gbif_id: taxonData.gbif_id,
      title: options.gbifLayerLabel,
      description: options.gbifLayerDescription,
      hover: options.gbifLayerHover,
      controlPosition: options.controlPosition
    }));
  }
};

inatTaxonMap.addPlaceLayers = function( map, options ) {
  if( options.placeLayers ) {
    window.lodash.each( options.placeLayers, function( layer ) {
      if( ! layer.place ) { return; }
      map.addPlaceLayer( window.lodash.defaults( window.lodash.clone( layer ), {
        title: layer.place.name,
        description: options.placeLayerLabel
      }));
    });
  }
};

inatTaxonMap.addObservationLayers = function( map, options ) {
  options = options || {}
  if( options.observationLayers ) {
    window.lodash.each( options.observationLayers, function( layer ) {
      var title = options.title || layer.title || options.featuredLayerLabel || 'Observations';
      map.addObservationsLayer( title, window.lodash.defaults( window.lodash.clone( layer ), {
        controlPosition: options.controlPosition,
        mapStyle: options.mapStyle,
        infoWindowCallback: options.infoWindowCallback
      }));
    });
  }
};

inatTaxonMap.removeObservationLayers = function( map, options ) {
  options = options || {}
  var title = options.title || options.featuredLayerLabel || 'Observations';
  map.removeObservationsLayer( title );
};

inatTaxonMap.addObservationsToMap = function( map, options, preserveViewport ) {
  if( !options.observations ) {
    return;
  }
  var letter_counter = 0,
      letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

  window.lodash.each(options.observations, function( o ) {
    if( !o ) { return; }
    var icon_div =jQuery('#observation-'+ o.id +' .icon').get(0);
    if (!((o.latitude && o.longitude) || (o.private_latitude && o.private_longitude))) {
      if( options.appendMarkerToList ) {
        var icon_img =jQuery('<img src="<%= asset_path("mapMarkers/questionmarker.png") %>"/>');
       jQuery(icon_div).text('').append(icon_img);
        return;
      }
    }
    observationOptions = { clickable: false, showAccuracy: options.showAccuracy };
    if( options.flagLetters ) {
      observationOptions.icon = iNaturalist.Map.createObservationIcon({
        color: "HotPink",
        character: letters[ letter_counter ],
        stemless: o.coordinates_obscured,
        quality_grade: o.quality_grade
      });
    }
    map.addObservation(o, observationOptions);
    if( options.appendMarkerToList && o.marker) {
      var marker = o.marker;
      var src = o.marker.getIcon( );
      if (src.url) src = src.url;
      var icon_img =jQuery('<img/>').attr('src', src).addClass('marker');
     jQuery(icon_div).text('').append( icon_img );
     jQuery(icon_img).click( function( ) {
        map.openInfoWindow.apply( o.marker );
      });
    }
    letter_counter++;
  });
  if ( preserveViewport ) { return }
  if( options.observations.length !== 1 ) {
    map.zoomToObservations();
    return
  }
  google.maps.event.addListenerOnce(map, 'idle', function(){
    o = options.observations[0];
    var center = new google.maps.LatLng(
      o.private_latitude || o.latitude,
      o.private_longitude || o.longitude);
    map.setCenter(center);

    // Start setting the map bounds. For single observations, this largeley
    // depends on the precision of the coordinates
    var accuracyCircle;
    // Viewer can view private coordinates and positional accuracy set
    if (o.private_latitude && o.positional_accuracy) {
      accuracyCircle = new google.maps.Circle({
        center: new google.maps.LatLng(o.private_latitude, o.private_longitude),
        radius: o.positional_accuracy
      })
    // Viewer cannot view private coordinates or they haven't been set, show the public positional accuracy
    } else if (o.public_positional_accuracy) {
      accuracyCircle = new google.maps.Circle({
        center: new google.maps.LatLng(o.latitude, o.longitude),
        radius: o.public_positional_accuracy
      })
    }

    // Default to showing the map scale used when the user was editing the observation, or something in the middle
    if (o.map_scale) {
      map.setZoom(o.map_scale)
    } else {
      map.setZoom(8)
    }

    // If there is an accuracy circle, make sure we don't default to zooming in so far it isn't shown
    if (accuracyCircle) {
      var mapBounds = map.getBounds(),
          circleBounds = accuracyCircle.getBounds()
      if (circleBounds.contains(mapBounds.getNorthEast()) && circleBounds.contains(mapBounds.getSouthWest())) {
        map.fitBounds(circleBounds)
      } else if (!o.map_scale) {
        map.setZoom(10)
      }
    }
  })
};

inatTaxonMap.fitGoogle = function( elt ) {
  var options =jQuery(elt).data('taxonMapOptions'),
      map =jQuery(elt).data('taxonMap');
  if (!map) { return; }
  if (options.minX) {
    map.fitBounds(
      new google.maps.LatLngBounds(
        new google.maps.LatLng(options.minY, options.minX),
        new google.maps.LatLng(options.maxY, options.maxX)
      )
    );
    return;
  }
  map.setCenter(new google.maps.LatLng(0, 0));
  map.setZoom(1);
};
