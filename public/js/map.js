function iniciarMap(x, y) {
  var coord = { lat: 14.100723, lng: -87.182531 };
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 10,
    center: coord
  });
  var marker = new google.maps.Marker({
    position: coord,
    map: map
  });
}

module.exports = {
  iniciarMap: iniciarMap
};