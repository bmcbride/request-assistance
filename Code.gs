var sheetID = '13XUVhV3DBpap3frpF5Gg-oTGON5SR7xdDMT1Ryhj1RM';
var folderID = '0ByynEG-WYyafSFFCX0JMS2pMaW8';

function doPost(e){
  return handleResponse(e);
}

function handleResponse(e) {
  var fileURL = '';

  if (e.parameter.photo && e.parameter.photo.length > 0) {
    var timestamp = new Date().getTime();
    var data = Utilities.base64Decode(e.parameters.photo, Utilities.Charset.UTF_8);
    var blob = Utilities.newBlob(data, MimeType.JPEG, timestamp + ".jpg");
    var folder = DriveApp.getFolderById(folderID);
    var file = folder.createFile(blob);
    fileURL = 'https://docs.google.com/uc?id=' + file.getId();
  }

  var sheet = SpreadsheetApp.openById(sheetID).getSheets()[0];
  sheet.appendRow([
    new Date().toLocaleString(),
    'Reported',
    e.parameter.latitude,
    e.parameter.longitude,
    e.parameter.apartment,
    e.parameter.address,
    e.parameter.city,
    e.parameter.state,
    e.parameter.zip,
    e.parameter.county,
    e.parameter.location_comments,
    e.parameter.name,
    e.parameter.email,
    e.parameter.phone,
    e.parameter.twitter,
    e.parameter.facebook,
    e.parameter.people,
    e.parameter.pets,
    e.parameter.pet_types,
    e.parameter.special_considerations,
    e.parameter.other_comments,
    fileURL]);
  return ContentService.createTextOutput('Success!');
}
