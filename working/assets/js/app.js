var app = {

  urlParams: {},

  userFields: [],

  bounds: new google.maps.LatLngBounds(),

  infoWindow: new google.maps.InfoWindow({
    disableAutoPan: true
  }),

  geocoder: new google.maps.Geocoder(),

  autocomplete: new google.maps.places.Autocomplete((document.getElementById("search")), {
    types: ["geocode"]
  }),

  init: function() {
    this.resize();
    this.bindUIActions();
    this.loadURLparams();
    this.buildMap();
    this.initLocationCtrl();

    $(window).resize(function () {
      $("#table").bootstrapTable("resetView", {
        height: $("#table-container").height()
      });
      app.resize();
      google.maps.event.trigger(map, "resize");
    });

    $(".navbar-collapse").on("hidden.bs.collapse", function () {
      $(window).trigger("resize");
    });
  },

  resize: function() {
    $("body").css("padding-top", $(".navbar").css("height"));
  },

  bindUIActions: function() {
    $("#extent-btn").click(function() {
      app.map.fitBounds(app.bounds);
      $(".navbar-collapse").collapse("hide");
      return false;
    });

    $("#download-btn").click(function() {
      $(".navbar-collapse").collapse("hide");
    });

    $("#copy-url-btn").click(function() {
      var copyText = $("#url-input")[0];
      copyText.select();
      document.execCommand("copy");
      alert("Link copied!");
    });

    $("[name='view']").click(function() {
      if (this.id === "split-view-btn") {
        app.switchView("split");
        return false;
      } else if (this.id === "map-view-btn") {
        app.switchView("map");
        return false;
      } else if (this.id === "table-view-btn") {
        app.switchView("table");
        return false;
      }
    });
  },

  loadURLparams: function() {
    app.urlParams = new URLSearchParams(window.location.search);

    if (app.urlParams.has("title")) {
      var title = app.urlParams.get("title");
      $("[name='title']").html(title);
    }

    if (app.urlParams.has("share")) {
      var share = app.urlParams.get("share");
      var url = "https://web.fulcrumapp.com/shares/" + share;
      app.fetchData(share);
      $("#url-geojson").attr("href", url + ".geojson?newest_first=true");
      $("#url-csv").attr("href", url + ".csv?newest_first=true");
      $("#url-kml").attr("href", url + ".kml?newest_first=true");
      $("#url-json").attr("href", url + ".json?newest_first=true");
    } else {
      alert("share parameter (data share ID) required!");
      return false;
    }

    if (app.urlParams.has("fields")) {
      app.fields = app.urlParams.get("fields").split(",");
      $.each(app.fields, function(index, field) {
        field = decodeURI(field);
        app.userFields.push(field);
      });
    }

    if (app.urlParams.has("hidden")) {
      app.hidden = app.urlParams.get("hidden").split(",");
    }
  },

  buildMap: function() {
    var mapTypeIds = [];
    for(var type in google.maps.MapTypeId) {
      mapTypeIds.push(google.maps.MapTypeId[type]);
    }
    mapTypeIds.push("OSM");

    app.map = new google.maps.Map(document.getElementById("map"), {
      styles: [{
        featureType: "poi",
        stylers: [{visibility: "off"}]
      }, {
        featureType: "transit",
        elementType: "labels.icon",
        stylers: [{visibility: "off"}]
      }],
      fullscreenControl: false,
      zoomControl: false,
      mapTypeControl: true,
      mapTypeControlOptions: {
        style: google.maps.MapTypeControlStyle.DROPDOWN_MENU,
        mapTypeIds: mapTypeIds
      },
      controlSize: 28,
      mapTypeId: app.urlParams.has("map") ? app.urlParams.get("map") : "roadmap"
    });

    app.map.mapTypes.set("OSM", new google.maps.ImageMapType({
      getTileUrl: function(coord, zoom) {
        return "https://tile.openstreetmap.org/" + zoom + "/" + coord.x + "/" + coord.y + ".png";
      },
      tileSize: new google.maps.Size(256, 256),
      name: "OSM",
      maxZoom: 18
    }));

    var OSMattribution = document.createElement("div");
    OSMattribution.id = "OSMattribution";
    OSMattribution.innerHTML = "<div class='text-center' style='margin-bottom: 15px; margin-right: -40px; color: white; text-shadow: black 0.1em 0.1em 0.2em'>© <a href='https://www.openstreetmap.org/copyright' target='_blank' style='color: white; text-decoration: none;'>OpenStreetMap contributors</a></div>";
    OSMattribution.style.display = "none";
    app.map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(OSMattribution);

    var logoControlDiv = document.createElement("DIV");
    var logoControl = new app.addLogoControl(logoControlDiv);
    logoControlDiv.index = 0; // used for ordering
    // app.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(logoControlDiv);

    app.markerCluster = new MarkerClusterer(app.map, null, {
      imagePath: "./assets/vendor/js-marker-clusterer/images/m",
      maxZoom: 16
    });

    app.selectedFeature = new google.maps.Marker({
      map: app.map,
      clickable: false,
      zIndex: 100,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        strokeColor: "white",
        strokeWeight: 1,
        fillColor: "#00ffff",
        fillOpacity: 0.9
      }
    });

    if (app.urlParams.has("cluster") && (app.urlParams.get("cluster") == "true" || app.urlParams.get("cluster") == "1")) {
      app.map.data.setMap(null);
    }

    app.map.addListener("click", function(event) {
      $("input").blur();
      app.selectedFeature.setPosition(null);
    });

    app.map.addListener("dragstart", function(event) {
      $("input").blur();
    });

    app.map.addListener("maptypeid_changed", function(event) {
      if (app.map.getMapTypeId() == "OSM") {
        $("#OSMattribution").show();
      } else {
        $("#OSMattribution").hide();
      }
    });

    app.autocomplete.addListener("place_changed", function() {
      var place = this.getPlace();
      if (place) {
        app.placeChanged(place);
      }
    });

    app.autocomplete.bindTo("bounds", app.map);

    app.map.data.setStyle(function(feature) {
      var style = {
        zIndex: 1,
        fillColor: "red",
        fillOpacity: 0.2,
        strokeColor: "red",
        strokeOpacity: 1,
        strokeWeight: 2
      };
      
      if (feature.getProperty("marker-color")) {
        var color = feature.getProperty("marker-color");
        style = {
          zIndex: 1,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 6,
            strokeColor: "white",
            strokeWeight: 1,
            fillColor: color,
            fillOpacity: 0.9
          }
        };
      }
      return (style);
    });

    app.map.data.addListener("mouseover", function(event) {
      if (app.urlParams.has("hover")) {
        var fields = app.urlParams.get("hover").split(",");
        var value = fields.map(function(field) {
          return event.feature.getProperty(field);
        });
        if (!value.includes(null)) {
          app.infoWindow.setContent(value.join(" | "));
          app.infoWindow.setPosition(event.feature.getGeometry().get());
          app.infoWindow.open(app.map);
        }
      } else {
        app.infoWindow.close();
      }
    });

    app.map.data.addListener("mouseout", function(event) {
      app.infoWindow.close();
    });

    app.map.data.addListener("click", function(event) {
      app.clickFeature(event.feature);
    });

    if (app.urlParams.has("attribution")) {
      var attribution = decodeURIComponent(app.urlParams.get("attribution"));
      var attributionDiv = document.createElement("div");
      if (attribution.startsWith("http")) {
        attribution = "<a href='" + attribution + "' target='_blank' style='color: rgb(68, 68, 68); text-decoration: none;'>" + attribution + "</a>";
      }
      attributionDiv.id = "attribution";
      attributionDiv.innerHTML = '<div class="gmnoprint gm-style-cc" draggable="false" style="z-index: 1000001; user-select: none; height: 14px; line-height: 14px; position: absolute; right: 0px; bottom: 0px;"><div style="opacity: 0.7; width: 100%; height: 100%; position: absolute;"><div style="width: 1px;"></div><div style="background-color: rgb(245, 245, 245); width: auto; height: 100%; margin-left: 1px;"></div></div><div style="position: relative; padding-right: 6px; padding-left: 6px; font-family: Roboto, Arial, sans-serif; font-size: 10px; color: rgb(68, 68, 68); white-space: nowrap; direction: ltr; text-align: right; vertical-align: middle; display: inline-block;">' + attribution +'</div></div>';
      attributionDiv.index = 1;
      app.map.controls[google.maps.ControlPosition.BOTTOM_RIGHT].push(attributionDiv);
    }

  },

  initLocationCtrl: function() {
    var watchId;

    var locationMarker = new google.maps.Marker({
      map: app.map,
      clickable: false,
      visible: false,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        fillColor: "#3a84df",
        fillOpacity: 0.9,
        strokeColor: "#fff",
        strokeWeight: 2
      }
    });

    var locationCircle = new google.maps.Circle({
      map: app.map,
      clickable: false,
      visible: false,
      radius: 1,
      strokeColor: "#3a84df",
      strokeOpacity: 0.8,
      strokeWeight: 0.5,
      fillColor: "#3a84df",
      fillOpacity: 0.10
    });

    var geolocationBtn = document.createElement("div");
    geolocationBtn.id = "geolocationBtn";
    geolocationBtn.style.cssText = "background-color:#fff;border:2px solid #fff;border-radius 3px;box-shadow:rgba(0,0,0,0.3) 0px 1px 4px -1px;margin-right:7px;cursor:pointer;border-radius:2px;padding:3px;";
    geolocationBtn.index = 1;

    var geolocationIcon = document.createElement("div");
    geolocationIcon.id = "geolocationIcon";
    geolocationIcon.style.cssText = "background-size:36px 18px;width:18px;height:18px;opacity:0.9;background-image:url(assets/img/geolocation.png);";

    geolocationBtn.appendChild(geolocationIcon);

    google.maps.event.addDomListener(geolocationBtn, "click", function() {
      if (navigator.geolocation) {
        if (locationMarker.getVisible()) {
          locationMarker.setVisible(false);
          locationCircle.setVisible(false);
          navigator.geolocation.clearWatch(watchId);
          geolocationIcon.style.backgroundPosition = "";
        } else {
          locationMarker.setVisible(true);
          locationCircle.setVisible(true);
          geolocationIcon.style.backgroundPosition = "-18px";
          navigator.geolocation.getCurrentPosition(function(position){
            locationUpdate(position);
            app.map.fitBounds(locationCircle.getBounds());
            watchId = navigator.geolocation.watchPosition(locationUpdate, geolocationError, {enableHighAccuracy: true});
          }, geolocationError, {enableHighAccuracy: true});
        }
      } else {
        alert("Error: Your browser doesn't support geolocation.");
      }
    });

    function geolocationError(error) {
      alert("Error: " + error.message);
      locationMarker.setVisible(false);
      locationCircle.setVisible(false);
    }

    function locationUpdate(position){
      var latLng = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
      locationMarker.setPosition(latLng);
      locationCircle.setCenter(latLng);
      locationCircle.setRadius(position.coords.accuracy);
    }

    app.map.controls[google.maps.ControlPosition.RIGHT_BOTTOM].push(geolocationBtn);
  },

  clickFeature: function(feature) {
    var content = "<table class='table table-striped table-bordered table-sm'>";
    if (app.userFields.length > 0) {
      $.each(app.userFields, function(index, prop) {
        val = app.formatProperty(feature.getProperty(prop));
        if (val) {
          content += "<tr><th>" + prop.toUpperCase().replace("_URL", "").replace(/_/g, " ") + "</th><td>" + val + "</td></tr>";
        }
      });
    } else {
      feature.forEachProperty(function(val, prop) {
        if (prop !== "_id_") {
          val = app.formatProperty(val);
          if (val) {
            content += "<tr><th>" + prop.toUpperCase().replace(/_/g, " ") + "</th><td>" + val + "</td></tr>";
          }
        }
      });
    }
    content += "<table>";
    $("#feature-info").html(content);
    $("#feature-modal").modal("show");

    app.selectFeature(feature.getGeometry().get().lat(), feature.getGeometry().get().lng());
    app.urlParams.append("id", feature.getId());
    var link = location.origin + location.pathname + "?" + app.urlParams.toString();
    $("#url-input").val(link);
  },

  addMarkerToCluster: function(feature) {
    var icon;
    
    if (feature.getProperty("marker-color")) {
      var color = feature.getProperty("marker-color");
      icon = {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 6,
        strokeColor: "white",
        strokeWeight: 1,
        fillColor: color,
        fillOpacity: 0.9
      };
    }
    
    var marker = new google.maps.Marker({
      position: feature.getGeometry().get(),
      icon: icon
    });

    app.markerCluster.addMarker(marker);
    
    google.maps.event.addListener(marker, "mouseover", function(event) {
      if (app.urlParams.has("hover")) {
        var fields = app.urlParams.get("hover").split(",");
        var value = fields.map(function(field) {
          return feature.getProperty(field);
        });
        if (!value.includes(null)) {
          app.infoWindow.setContent(value.join(" | "));
          app.infoWindow.open(app.map, marker);
        }
      } else {
        app.infoWindow.close();
      }
    });

    google.maps.event.addListener(marker, "mouseout", function(event) {
      app.infoWindow.close();
    });

    google.maps.event.addListener(marker, "click", function(event) {
      app.clickFeature(feature);
    });
  },

  selectFeature: function(lat, lng){
    app.selectedFeature.setPosition({
      lat: lat,
      lng: lng
    });
  },

  placeChanged: function(place) {
    if (place && place.geometry) {
      app.map.setCenter(place.geometry.location);
      app.map.setZoom(18);
      if (place.geometry.viewport) {
        app.map.fitBounds(place.geometry.viewport);
      }
      app.infoWindow.setPosition(place.geometry.location);
      app.infoWindow.setContent("<div class='text-center'><strong>" + place.formatted_address + "</strong><div class='place-coordinates'>" + place.geometry.location.lat().toFixed(6) + ", " + place.geometry.location.lng().toFixed(6) + "</div></div>");
      app.infoWindow.open(app.map);
    } else if (place.name) {
      app.geocodeAddress(place.name);
    }
    $(".navbar-collapse").collapse("hide");
  },

  geocodeAddress: function(address) {
    app.geocoder.geocode({
      "address": address
    }, function(results, status) {
      if (status === "OK") {
        app.map.setCenter(results[0].geometry.location);
        app.map.setZoom(18);
        if (results[0].geometry.bounds) {
          app.map.fitBounds(results[0].geometry.bounds);
        }
        app.infoWindow.setPosition(results[0].geometry.location);
        app.infoWindow.setContent(results[0].formatted_address);
        app.infoWindow.open(app.map);
      } else {
        alert("Geocode was not successful for the following reason: " + status);
      }
    });
    $(".navbar-collapse").collapse("hide");
  },

  fetchData: function(share) {
    var columns = [], data = [];
    $.ajax({
      type: "GET",
      url: "https://web.fulcrumapp.com/shares/" + share + ".geojson?newest_first=true",
      success: function(geojson, status, xhr) {
        columns = Object.keys(geojson.features[0].properties);

        if (app.userFields.length > 0) {
          var allColumns = columns;
          columns = [];
          $.each(app.userFields, function(index, prop) {
            if (allColumns.indexOf(prop) >= 0) {
              columns.push(prop);
            }
          });
        }

        $.each(geojson.features, function(index, feature) {
          feature.id = index + 1;
          feature.properties._id_ = index + 1;
          data.push(feature.properties);          
        });

        columns = columns.map(function(column) {
          return ({
            field: column,
            title: column.toUpperCase().replace("_URL", "").replace(/_/g, " "),
            sortable: true,
            align: column.endsWith("_url") ? "center" : "left",
            valign: "middle",
            visible: (app.hidden && app.hidden.indexOf(column) !== -1 || column == "_id_") ? false : true,
            formatter: app.formatProperty,
            cellStyle: app.styleCell
          });
        });

        app.map.data.addGeoJson(geojson);

      }
    }).done(function() {
      // set global bounds
      app.map.data.forEach(function (feature) {
        if (feature.getGeometry()) {
          feature.getGeometry().forEachLatLng(function(latLng){
            app.bounds.extend(latLng);
          });
          if (feature.getGeometry().getType() == "Point" && app.urlParams.has("cluster") && (app.urlParams.get("cluster") == "true" || app.urlParams.get("cluster") == "1")) {
            app.addMarkerToCluster(feature);
          }
        }
      });

      // if feature id paramater present, zoom to feature
      if (app.urlParams.has("id") && app.urlParams.get("id").length > 0) {
        var feature = app.map.data.getFeatureById(app.urlParams.get("id"));
        var featureBounds = new google.maps.LatLngBounds();
        feature.getGeometry().forEachLatLng(function(latLng){
          featureBounds.extend(latLng);
        });

        // setCenter for points, fitBounds for others
        if (feature.getGeometry().getType() == "Point") {
          app.map.setCenter(feature.getGeometry().get());
          app.map.setZoom(18);
        } else {
          app.map.fitBounds(featureBounds);
        }

        // trigger click to pop up modal and highlight feature
        google.maps.event.trigger(app.map.data, "click", {
          feature: app.map.data.getFeatureById(app.urlParams.get("id"))
        });

      // if no id parameter passed, zoom to all features
      } else {
        app.map.fitBounds(app.bounds);
      }

      app.buildTable(columns, data);
    });
    
  },

  buildTable: function(columns, data) {
    $("#table").bootstrapTable({
      cache: false,
      classes: "table table-bordered table-hover table-sm",
      toolbar: "#toolbar",
      toolbarAlign: "right",
      buttonsClass: "light",
      height: $("#table-container").height(),
      undefinedText: "",
      striped: false,
      pagination: false,
      minimumCountColumns: 1,
      sortName: app.urlParams.has("sort") ? app.urlParams.get("sort") : "_id_",
      sortOrder: app.urlParams.has("order") ? app.urlParams.get("order") : "asc",
      search: true,
      trimOnSearch: false,
      searchAlign: "left",
      showColumns: true,
      showToggle: false,
      buttonsAlign: "left",
      uniqueId: "_id_",
      columns: columns,
      data: data,
      onPostBody: function(data) {
        $("#table").on("mouseover", "tbody tr", function() {
          var feature = data[$(this).index()];
          
          if (app.urlParams.has("hover")) {
            var fields = app.urlParams.get("hover").split(",");
            var value = fields.map(function(field) {
              return feature[field];
            });
            if (!value.includes(null)) {
              app.infoWindow.setContent(value.join(" | "));
              app.infoWindow.setPosition({
                lat: feature.latitude,
                lng: feature.longitude
              });
              app.infoWindow.open(app.map);
            }
          } else {
            app.infoWindow.close();
          }
        });

        $("#table").on("mouseout", "tbody tr", function() {
          app.infoWindow.close();
        });
      },
      onClickRow: function(row, $element) {
        app.zoomToFeature(row.latitude, row.longitude);
        if (app.map.getStreetView().getVisible()) {
          app.map.getStreetView().setPosition({
            lat: row.latitude,
            lng: row.longitude
          });
        }
      },
      onDblClickRow: function(row) {
        var feature = app.map.data.getFeatureById(row._id_);
        app.clickFeature(feature);
      },
      onSearch: function(text) {
        var data = $("#table").bootstrapTable("getData");
        var visibleIDs = data.map(function(feature) {
          return (feature._id_);
        });
        app.bounds = new google.maps.LatLngBounds();
        app.markerCluster.clearMarkers();
        app.map.data.forEach(function(feature) {
          if ($.inArray(feature.getId(), visibleIDs) == -1) {
            app.map.data.overrideStyle(feature, {
              visible: false
            });
          } else {
            app.map.data.overrideStyle(feature, {
              visible: true
            });
            if (feature.getGeometry()) {
              feature.getGeometry().forEachLatLng(function(latLng){
                app.bounds.extend(latLng);
                if (feature.getGeometry().getType() == "Point" && app.urlParams.has("cluster") && (app.urlParams.get("cluster") == "true" || app.urlParams.get("cluster") == "1")) {
                  app.addMarkerToCluster(feature);
                }
              });
            }
          }
        });
        $("#feature-count").html(data.length);
      }
    });

    $(".search input").attr("placeholder", "Filter Records");
    $("#feature-count").html(data.length);
    $("#total-count").html(data.length);
  },

  zoomToFeature: function(lat, lng) {
    app.selectFeature(lat, lng);
    app.map.setCenter({
      lat: lat,
      lng: lng,
    })
    app.map.setZoom(17);
  },

  formatProperty: function(value) {
    if (!value) {
      value = "";
    }
    else if (typeof value == "string" && (value.startsWith("http"))) {
      if (value.indexOf("https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/photos/") === 0) {
        value = "<button type='button' class='btn btn-secondary btn-sm' onclick='app.photoGallery(\"" + value + "\");' title='View photos'><i class='fa fa-camera'></i></button>";
      } else if (value.indexOf("https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/videos/") === 0) {
        value = "<button type='button' class='btn btn-secondary btn-sm' onclick='app.videoGallery(\"" + value + "\");' title='View videos'><i class='fa fa-play-circle'></i></button>";
      } else if (value.indexOf("https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/audio/") === 0) {
        value = "<button type='button' class='btn btn-secondary btn-sm' onclick='app.audioGallery(\"" + value + "\");' title='View audio'><i class='fa fa-play-circle'></i></button>";
      } else {
        value = "<a href='" + value + "' target='_blank'>" + value + "</a>";
      }
    }
    return value;
  },

  photoGallery: function (photos) {
    var photoArray = [];
    var photoIDs = photos.split("photos=")[1];
    $.each(photoIDs.split("%2C"), function(index, id) {
      photoArray.push({src: "https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/photos/" + id});
    });
    $.fancybox.open(photoArray);
    return false;
  },

  videoGallery: function (videos) {
    var videoArray = [];
    var videoIDs = videos.split("videos=")[1];
    $.each(videoIDs.split("%2C"), function(index, id) {
      videoArray.push({src: "https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/videos/" + id, type: "iframe"});
    });
    $.fancybox.open(videoArray);
    return false;
  },

  audioGallery: function (audio) {
    var audioArray = [];
    var audioIDs = audio.split("audio=")[1];
    $.each(audioIDs.split("%2C"), function(index, id) {
      audioArray.push({src: "https://web.fulcrumapp.com/shares/" + app.urlParams.get("share") + "/audio/" + id, type: "iframe"});
    });
    $.fancybox.open(audioArray);
    return false;
  },

  styleCell: function(value, row, index, field) {
    if (field == "status") {
      return {
        css: {
          "box-shadow": "inset 10px 0em " + row["marker-color"],
          "padding-left": "18px"
        }
      };
    }
    else {
      return {};
    }
  },

  addLogoControl: function (controlDiv) {
    var logo = document.createElement("IMG");
    controlDiv.style.padding = "5px";
    logo.style.width = "90px";
    logo.src = "assets/img/fulcrum-map-logo-community.png";
    logo.style.cursor = "pointer";
    controlDiv.appendChild(logo);
    google.maps.event.addDomListener(logo, "click", function() {
      window.location = "https://www.fulcrumapp.com/community";
    });
  },

  switchView: function(view) {
    if (view == "split") {
      $("#table-container").show().css("height", "60%");
      $("#map-container").show().css("height", "40%");
      $(window).resize();
    } else if (view == "map") {
      $("#map-container").show().css("height", "100%");
      $("#table-container").hide();
      $(window).resize();
    } else if (view == "table") {
      $("#table-container").show().css("height", "100%");
      $("#map-container").hide();
      $(window).resize();
    }
    $("#view-dropdown").dropdown("toggle");
    $(".navbar-collapse").removeClass("show");
    app.resize();
  }
};

$(document).ready(function() {
  app.init();
  $("#search").keydown(function(event){
    if (event.keyCode == 13) {
      event.preventDefault();
      return false;
    }
  });
});

$(document).ajaxComplete(function(){
  $("#loading").hide();
});