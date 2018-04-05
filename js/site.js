var app = angular.module("myApp", ["ngAnimate"]);
app.controller("MainCtrl", function ($scope) {
    $scope.detDivValue = true;
    $scope.show = false;
});

var _urlQueryEnum =
    {
        NextPage: "next_page",
        PlaceSearch: "place_search",
        GeoCode: "geo_code",
        GeoCodeFrom: "geo_code_from",
        Details: "details"
    };

var _reviewSorting =
    {
        Default: "default",
        HighestRating: "highest_rating",
        LowestRating: "lowest_rating",
        MostRecent: "most_recent",
        LeastRecent: "least_recent"
    };

var _pageCount = 0;
var _globalLat = 0;
var _globalLon = 0;
var _myLat = 0;
var _myLon = 0;
var _dirOriginLat = 0;
var _dirOriginLng = 0;
var _rowCount = 1;
var _favRowCount = 0;
var _autocomplete, _autocompleteDetails, _placeSearch;
var _nextPageToken;
var _currentPlaceId;
var _directionsDisplay;
var _directionsService;
var _dResult;
var _resultsArray;
var _currentTab = "Results";
var _yelpReviews = "";
var _currentReviewsSort = "default";
var _favPerPageRows = 20;
var _prevPageStart = 0;
var _detLocationAlreadySet = false;
var _locationAlreadySet = false;

$(function () {
    //Get Current Location
    CallIpApi();

    $("#fromText").on('keyup', function () {
        if($("#fromText").val().trim() != ""){
            $("#directionsButton").prop("disabled", false);
        } else{
            $("#directionsButton").prop("disabled", true);
        }
        _detLocationAlreadySet = false;
        _dirOriginLat = 0;
        _dirOriginLng = 0;
    });

    $("#keyWordText").blur(function () {
        if ($("#keyWordText").val().trim() == "") {
            $("#keywordFeedback").show();
            $("#keyWordText").addClass("errorBorder");
        }
    });

    $("#keyWordText").on('keyup', function () {
        var textValue = $("#keyWordText").val();
        textValue = textValue.trim();
        if (textValue != "") {
            $("#keywordFeedback").hide();
            $("#keyWordText").removeClass("errorBorder");

            if ($("#radioOtherLocation").prop("checked") == true) {
                if ($("#locationText").val().trim() != "") {
                    $("#searchButton").prop('disabled', false);
                }
            } else {
                $("#searchButton").prop('disabled', false);
            }
        } else {
            $("#keywordFeedback").show();
            $("#keyWordText").addClass("errorBorder");
            $("#searchButton").prop('disabled', true);
        }
    });

    $("#locationText").blur(function () {
        if ($("#locationText").val().trim() == "") {
            $("#locationFeedback").show();
            $("#locationText").addClass("errorBorder");
        }
        else {
            var url = GetUrl(_urlQueryEnum.GeoCode);
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: url,
                async: true,
                success: function (mainResults) {
                    if (!ObjectEmpty(mainResults.results)) {
                        if (mainResults.results.length > 0) {
                            if (!_locationAlreadySet) {
                                var place = mainResults.results[0];
                                _globalLat = place.geometry.location.lat;
                                _globalLon = place.geometry.location.lng;

                                _dirOriginLat = place.geometry.location.lat;
                                _dirOriginLng = place.geometry.location.lng;

                                if ($("#keyWordText").val().trim() != "")
                                    $("#searchButton").prop("disabled", false);
                            }
                        }
                    }
                }
            });
        }
    });

    $("#fromText").blur(function (event) {
        if ($("#fromText").val().trim() != "") {
            var url = GetUrl(_urlQueryEnum.GeoCodeFrom);
            $.ajax({
                type: "GET",
                dataType: 'json',
                url: url,
                async: true,
                success: function (mainResults) {
                    if (!ObjectEmpty(mainResults.results)) {
                        if (mainResults.results.length > 0) {
                            if (!_detLocationAlreadySet) {
                                var place = mainResults.results[0];
                                _dirOriginLat = place.geometry.location.lat;
                                _dirOriginLng = place.geometry.location.lng;

                                $("#directionsButton").prop("disabled", false);
                            }
                        }
                    }
                }
            });
        }
    });

    $("#locationText").on('keyup', function () {
        _locationAlreadySet = false;
        var textValue = $("#locationText").val();
        textValue = textValue.trim();
        if (textValue != "") {
            $("#locationFeedback").hide();
            $("#locationText").removeClass("errorBorder");
        } else {
            $("#locationFeedback").show();
            $("#locationText").addClass("errorBorder");
            $("#searchButton").prop('disabled', true);
        }
    });

    $('#divResult').on('click', '#innerDivResult #resultsDataTable tr #starButton', function () {
        var favRow = $(this).closest('td').parent()[0];
        var placeId = $(this).closest('td').parent()[0].childNodes[0].accessKey;

        var button = $(this).closest('td')[0].childNodes[0];
        var span = button.childNodes[0];

        if (span.className == "fas fa-star") {
            RemoveFavRow(favRow.outerHTML);
            span.className = "far fa-star";
        }
        else {
            if (localStorage.getItem("favouriteTable") == undefined) {
                localStorage.setItem("favouriteTable", JSON.stringify([favRow.outerHTML]));
            }
            else {
                var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
                favouriteTable.push(favRow.outerHTML);
                localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));
            }

            span.className = "fas fa-star";
            $("#detailsStarButton").get(0).childNodes[1].className = "fas fa-star";
            ChangeTableInStorage(placeId, true);
        }

        return false;
    });

    $('#divFavourite').on('click', '#innerDivFavourite #favDataTable tr #trashButton', function () {
        $(this).siblings().removeClass("highlight");

        var delRow = $(this).closest('td').parent()[0].childNodes[0].innerHTML;
        var delPlaceId = $(this).closest('td').parent()[0].childNodes[0].accessKey;
        delRow = delRow - 1;

        var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
        favouriteTable.splice(delRow, 1);
        localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));

        $("#detailsStarButton").get(0).childNodes[1].className = "far fa-star";

        _favRowCount = 0;
        $('#favPrevButton').hide();
        FillFavouriteTable();
        ChangeTableInStorage(delPlaceId, false);
        return false;
    });

    $("ul#pills-tab li #divResultTab").click(function () {
        _currentTab = "Results";
        $("#detailsDiv").hide();
        $("#divFavourite").hide();
        $("#pageButtons").show();

        if (ObjectEmpty(_resultsArray)) {
            $("#detailsButton").hide();
            $("#pageButtons").hide();
        }

        var scope = angular.element($("body")).scope();
        scope.$apply(function () {
            scope.detDivValue = true;
        });

        RefreshTable();
    });

    $("ul#pills-tab li #divFavouriteTab").click(function () {
        _currentTab = "Favourite";
        _favRowCount = 0;
        _prevPageStart = 0;
        $("#divResult").hide();
        $("#detailsDiv").hide();
        $("#favPrevButton").hide();

        var scope = angular.element($("body")).scope();
        scope.$apply(function () {
            scope.detDivValue = true;
        });

        FillFavouriteTable();
    });

    $('#divResult').on("click", '#innerDivResult #resultsDataTable tr', function () {
        $(this).addClass("highlight").siblings().removeClass("highlight");
        var savedRow = $(this).closest('tr')[0];

        $("#savedRow").html(savedRow.outerHTML);

        var placeNode = $(this).closest('tr')[0].childNodes[2];

        if (!ObjectEmpty(placeNode)) {
            var placeId = placeNode.accessKey;
            _currentPlaceId = placeId;

            $("#detailsButton").prop("disabled", false);
            $("#infoTab").tab("show");

            GetDetails();
        }
        var buttonClass = $(this).closest('tr')[0].childNodes[4].childNodes[0].childNodes[0].className;
        $("#detailsStarButton").get(0).childNodes[1].className = buttonClass;

        localStorage.setItem("table" + _pageCount, $("#resultsDataTable").get(0).outerHTML);
    });

    $('#divFavourite').on("click", '#innerDivFavourite #favDataTable tr', function () {
        $(this).addClass("highlight").siblings().removeClass("highlight");
        var savedRow = $(this).closest('tr')[0];

        $("#savedRow").html(savedRow.outerHTML);

        var placeNode = $(this).closest('tr')[0].childNodes[2];

        if (!ObjectEmpty(placeNode)) {
            var placeId = placeNode.accessKey;
            _currentPlaceId = placeId;

            $("#favDetailsButton").prop("disabled", false);
            $("#infoTab").tab("show");
            $("#detailsStarButton").get(0).childNodes[1].className = "fas fa-star";

            GetDetails();
        }
    });

    $('#detailsButtonDiv').on('click', '#detailsButton', function () {
        $("#divResult").hide();
        $("#detailsDiv").show();
    });

    $('#favDetailsButtonDiv').on('click', '#favDetailsButton', function () {
        $("#divFavourite").hide();
        $("#detailsDiv").show();
    });

    $('#divResult').on('click', '#resultsDataTable #sDetailButton', function () {
        $("#divResult").hide();
        $("#detailsDiv").show();

        var scope = angular.element($("#sDetailButton")).scope();
        scope.$apply(function () {
            scope.detDivValue = false;
        })
    });

    $('#divFavourite').on('click', '#favDataTable #sDetailButton', function () {
        $("#divFavourite").hide();
        $("#detailsDiv").show();

        var scope = angular.element($("#sDetailButton")).scope();
        scope.$apply(function () {
            scope.detDivValue = false;
        })
    });

    $("#googleReviewsButton").click(function () {
        var scope = angular.element($("body")).scope();
        scope.$apply(function () {
            scope.show = false;
        });

        FillReviewsDiv();
    });

    $("#yelpReviewsButton").click(function () {
        var scope = angular.element($("body")).scope();
        scope.$apply(function () {
            scope.show = false;
        });

        ShowYelpReviews();
    });
});

function SearchData() {
    var scope = angular.element($("body")).scope();
    scope.$apply(function () {
        scope.detDivValue = true;
    });
    ClearTablesFromStorage();
    $("#detailsStarButton").prop("disabled", true);
    $("#twitterIntent").addClass("disableAnchor");
    $('#divResultTab').tab('show');
    $("#detailsDiv").hide();
    $("#divFavourite").hide();
    $("#divResult").hide();
    $("#progressDiv").show();
    _rowCount = 1;
    _pageCount = 0;
    _resultsArray = "";
    _currentTab = "Results"
    $("#prevButton").hide();
    _yelpReviews = "";
    _currentReviewsSort = "default";
    $("#insideReviewsDiv").empty();
    $("#detailsButton").prop("disabled", true);
    $("#favDetailsButton").prop("disabled", true);
    $("#right-panel").empty();

    UpdateProgress(10);

    var url = GetUrl(_urlQueryEnum.PlaceSearch);
    UpdateProgress(30);
    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: true,
            success: function (mainResults) {
                UpdateProgress(100);
                CreateTableAndInsertRows(mainResults);
            },
            error: function () {
                var table = GetNoRecordsTable(true);
                $("#innerDivResult").html(table);
                $("#detailsButton").hide();
                $("#pageButtons").hide();
                UpdateProgress(0);
                $("#progressDiv").hide();
                $("#divResult").show();
                ClearTablesFromStorage();
            }
        });
}

function ClearTablesFromStorage() {
    localStorage.removeItem("table1");
    localStorage.removeItem("table2");
    localStorage.removeItem("table3");
}

function CreateTableAndInsertRows(mainResults) {
    if (mainResults.Error != undefined || mainResults.results == undefined) {
        var table = GetNoRecordsTable(true);
        $("#innerDivResult").html(table);
        $("#detailsButton").hide();
        $("#pageButtons").hide();
        ClearTablesFromStorage();
    }
    else {
        _pageCount += 1;

        _resultsArray = mainResults.results;

        if (_resultsArray.length == 0) {
            var table = GetNoRecordsTable();
            $("#innerDivResult").html(table);
            $("#detailsButton").hide();
            $("#pageButtons").hide();
            ClearTablesFromStorage();
        }
        else {
            _nextPageToken = mainResults.next_page_token;

            if (!ObjectEmpty(_nextPageToken)) {
                $("#nextButton").show();
            }
            else {
                $("#nextButton").hide();
            }

            var table = document.createElement("table");
            table.id = "resultsDataTable";
            table.align = "center";
            table.className = "table table-hover";
            table.style.width = "100%";
            table.style.margin = "0px auto";

            var tableHead = document.createElement("thead");
            table.appendChild(tableHead);

            var row = tableHead.insertRow(-1);

            var headerCell = document.createElement("th");
            headerCell.innerHTML = "#";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Category";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Name";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Address";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Favourite";
            row.appendChild(headerCell);

            headerCell = document.createElement("th");
            headerCell.innerHTML = "Details";
            row.appendChild(headerCell);

            var tableBody = document.createElement("tbody");

            for (var i = 0; i < _resultsArray.length; i++) {
                row = tableBody.insertRow(-1);

                var cell = row.insertCell(-1);
                cell.innerHTML = _rowCount;
                cell.accessKey = _resultsArray[i].place_id;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.className = "align-middle";
                cell.innerHTML = '<img alt=\"\" style = "max-width: 30px; max-height: 30px;" src="' + _resultsArray[i].icon + '"></img>';

                var cell = row.insertCell(-1);
                cell.innerHTML = _resultsArray[i].name;
                cell.accessKey = _resultsArray[i].place_id;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.innerHTML = _resultsArray[i].vicinity;
                cell.className = "align-middle";

                var cell = row.insertCell(-1);
                cell.style.textAlign = "left";
                if (CheckIfRowInFav(_resultsArray[i].place_id))
                    cell.innerHTML = "<button id=\"starButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"fas fa-star\"></span></button>";
                else
                    cell.innerHTML = "<button id=\"starButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"far fa-star\"></span></button>";

                var cell = row.insertCell(-1);
                cell.style.textAlign = "left";
                cell.innerHTML = "<button id=\"sDetailButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"fas fa-angle-right\"></span></button>";

                _rowCount += 1;
            }
            table.appendChild(tableBody);

            $("#detailsButton").show();
            $("#pageButtons").show();
            $("#detailsDiv").hide();

            $("#innerDivResult").html(table);
            localStorage.setItem("table" + _pageCount, table.outerHTML);
        }
    }
    UpdateProgress(0);
    $("#progressDiv").hide();
    $("#divResult").show();
}

function CheckIfRowInFav(placeID) {
    var ifRowExists = false;
    var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));

    if (favouriteTable == null || favouriteTable.length == 0)
        return false;

    for (var i = 0; i < favouriteTable.length; i++) {
        var favRow = $.parseHTML(favouriteTable[i]);
        if (favRow[0].childNodes[0].accessKey == placeID) {
            ifRowExists = true;
            break;
        }
        else {
            ifRowExists = false;
        }
    }
    return ifRowExists;
}

function UpdateProgress(percentage) {
    $('#progressBar').css('width', percentage + '%');
}

function RefreshTable() {
    var table = localStorage.getItem("table" + _pageCount);
    if (table != undefined)
        $("#innerDivResult").html(table);
    $("#divResult").show();
}

function ChangeTableInStorage(delPlaceId, fillStar) {
    var className;
    if (fillStar)
        className = "fas fa-star";
    else
        className = "far fa-star";

    for (var i = 1; i <= 3; i++) {
        var table = localStorage.getItem("table" + i);

        if (table != undefined) {
            var parsedTable = $.parseHTML(table);
            for (var j = 0; j < parsedTable[0].childNodes[1].childNodes.length; j++) {
                var row = parsedTable[0].childNodes[1].childNodes[j];
                var rowPlaceId = row.childNodes[0].accessKey;

                if (delPlaceId == rowPlaceId) {
                    var starButton = row.childNodes[4];
                    var span = starButton.childNodes[0].childNodes[0];
                    span.className = className;
                    row.classList.remove("highlight");
                    break;
                }
            }
            localStorage.setItem("table" + i, parsedTable[0].outerHTML);
        }
    }
}

function GetNoRecordsTable(error = false) {
    var alertDiv = document.createElement("div");
    alertDiv.style.width = "100%";
    alertDiv.style.margin = "50px auto";
    alertDiv.setAttribute("role", "alert");

    if (!error) {
        alertDiv.className = "alert alert-warning";
        alertDiv.innerHTML = "No records.";
    }
    else {
        alertDiv.className = "alert alert-danger";
        alertDiv.innerHTML = "Failed to get search results.";
    }
    return alertDiv;
}

function GetNextPageResultsFav() {
    var favRecords = JSON.parse(localStorage.getItem("favouriteTable"));
    var noOfRecords = 0;
    var nextNoOfRec = favRecords.length - _favRowCount;

    $("#favPrevButton").show();

    if (nextNoOfRec > _favPerPageRows) {
        noOfRecords = _favPerPageRows;
    } else {
        noOfRecords = nextNoOfRec;
    }

    FillFavouriteTable(_favRowCount, _favRowCount + noOfRecords);

    if (nextNoOfRec > _favPerPageRows) {
        $("#favNextButton").show();
    } else {
        $("#favNextButton").hide();
    }
}

function GetPrevPageResultsFav() {
    var favRecords = JSON.parse(localStorage.getItem("favouriteTable"));

    if (_prevPageStart == _favPerPageRows)
        $("#favPrevButton").hide();

    _favRowCount = _prevPageStart - _favPerPageRows;
    FillFavouriteTable(_favRowCount, _prevPageStart);
    $("#favNextButton").show();
}

function FillFavouriteTable(startRow = 0, rowsLength = _favPerPageRows) {
    $("#innerDivFavourite").empty();
    _prevPageStart = startRow;

    var favRecords = JSON.parse(localStorage.getItem("favouriteTable"));

    if (favRecords == null || favRecords.length == 0) {
        var table = GetNoRecordsTable();
        $("#innerDivFavourite").html(table);
        $("#favDetailsButton").hide();
        $("#favDetailsButton").prop("disabled", true);
    }
    else {

        if (favRecords.length <= _favPerPageRows) {
            rowsLength = favRecords.length;
        }
        else if (favRecords.length > _favPerPageRows) {
            $("#favNextButton").show();
            $("#favPageButtons").show();
        }
        else {
            $("#favPageButtons").hide();
        }

        var table = document.createElement("table");
        table.id = "favDataTable";
        table.align = "center";
        table.className = "table table-hover";
        table.style.textAlign = "left";
        table.style.width = "100%";
        table.style.margin = "0px auto";

        var tableHead = document.createElement("thead");
        table.appendChild(tableHead);

        var row = tableHead.insertRow(-1);

        var headerCell = document.createElement("th");
        headerCell.innerHTML = "#";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Category";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Name";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Address";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Favourite";
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = "Details";
        row.appendChild(headerCell);

        var tableBody = document.createElement("tbody");

        for (var i = startRow; i < rowsLength; i++) {
            var outerRow = $.parseHTML(favRecords[i])[0];
            var parsedRow = outerRow.childNodes;

            row = tableBody.insertRow(-1);

            if (parsedRow[0].accessKey == _currentPlaceId) {
                row.classList.add("highlight");
                $("#favDetailsButton").prop("disabled", false);
                $("#infoTab").tab("show");
                $("#detailsStarButton").get(0).childNodes[1].className = "fas fa-star";
                GetDetails();
            }

            var cell = row.insertCell(-1);
            cell.innerHTML = _favRowCount + 1;
            cell.accessKey = parsedRow[0].accessKey;
            cell.classList.add("align-middle");

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[1].innerHTML;
            cell.classList.add("align-middle");

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[2].innerHTML;
            cell.accessKey = parsedRow[2].accessKey;
            cell.classList.add("align-middle");

            var cell = row.insertCell(-1);
            cell.innerHTML = parsedRow[3].innerHTML;
            cell.classList.add("align-middle");

            var cell = row.insertCell(-1);
            cell.style.textAlign = "left";
            cell.classList.add("align-middle");
            cell.innerHTML = "<button id=\"trashButton\" style=\"border: 1px solid #807d7d56;\" class=\"btn btn-default\"><span class=\"fas fa-trash-alt\"></span></button>";

            var cell = row.insertCell(-1);
            cell.style.textAlign = "left";
            cell.classList.add("align-middle");
            cell.innerHTML = parsedRow[5].innerHTML;

            _favRowCount += 1;
        }
        table.appendChild(tableBody);

        $("#favDetailsButton").show();
        $("#detailsDiv").hide();
        $("#innerDivFavourite").html(table);
    }
    $("#divFavourite").show();
}

function AddToFavourite(button) {
    var favRow = $("#savedRow").html();
    if (button.childNodes[1].className == "fas fa-star") {
        RemoveFavRow(favRow);
        button.childNodes[1].className = "far fa-star"
    }
    else {
        if (localStorage.getItem("favouriteTable") == undefined) {
            localStorage.setItem("favouriteTable", JSON.stringify([favRow]));
        }
        else {
            var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
            favouriteTable.push(favRow);
            localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));
        }
        ChangeTableInStorage(_currentPlaceId, true);
        button.childNodes[1].className = "fas fa-star";
    }
}

function RemoveFavRow(row) {
    var favouriteTable = JSON.parse(localStorage.getItem("favouriteTable"));
    row = $.parseHTML(row);
    var rowIndex = -1;

    if (favouriteTable == null || favouriteTable.length == 0)
        return false;

    for (var i = 0; i < favouriteTable.length; i++) {
        var favRow = $.parseHTML(favouriteTable[i]);
        if (favRow[0].childNodes[0].accessKey == row[0].childNodes[0].accessKey) {
            rowIndex = i;
            break;
        }
    }
    if (rowIndex != -1) {
        favouriteTable.splice(rowIndex, 1);
        localStorage.setItem("favouriteTable", JSON.stringify(favouriteTable));
        $("#detailsStarButton").get(0).childNodes[1].className = "far fa-star";
        ChangeTableInStorage(row[0].childNodes[0].accessKey, false);
    }
}

function GetDetails() {
    var request =
        {
            placeId: _currentPlaceId
        };

    var map = new google.maps.Map(document.getElementById('map'));
    service = new google.maps.places.PlacesService(map);
    service.getDetails(request, ShowDetails);
}

function ShowDetails(result, status) {
    if (status === google.maps.places.PlacesServiceStatus.OK) {
        _dResult = result;
        $("#detailsStarButton").prop("disabled", false);
        $("#twitterIntent").removeClass("disableAnchor");
        
        $("#infoHeading").html(_dResult.name);
        var twitterText = "Check out " + _dResult.name;

        if (!ObjectEmpty(_dResult.formatted_address))
            twitterText += " located at " + _dResult.formatted_address + ". Website:";

        var twitterUrl = "";
        if (!ObjectEmpty(_dResult.website))
            twitterUrl = _dResult.website;
        else
            twitterUrl = _dResult.url;

        var twitterHashtag = "TravelAndEntertainmentSearch";

        twitterText = encodeURIComponent(twitterText);
        twitterUrl = encodeURIComponent(twitterUrl);

        twitterText = twitterText.replace(/#/g, "%23");
        twitterUrl = twitterUrl.replace(/#/g, "%23");

        $("#twitterIntent").attr("href", "https://twitter.com/share?ref_src=twsrc%5Etfw&text=" + twitterText + "&url=" + twitterUrl + "&hashtags=" + twitterHashtag);

        FillInfoDiv();
        FillPhotosDiv();
        FillMapDiv();
        FillReviewsDiv();
        GetYelpBusiness();
    }
}

function FillInfoDiv() {
    $("#addressInfoRow").show();
    $("#phoneInfoRow").show();
    $("#priceInfoRow").show();
    $("#ratingInfoRow").show();
    $("#googlePageInfoRow").show();
    $("#hoursInfoRow").show();
    $("#websiteInfoRow").show();

    if (ObjectEmpty(_dResult.formatted_address))
        $("#addressInfoRow").hide();
    else
        $("#addressInfo").html(_dResult.formatted_address);

    if (ObjectEmpty(_dResult.international_phone_number))
        $("#phoneInfoRow").hide();
    else
        $("#phoneInfo").html(_dResult.international_phone_number);

    if (ObjectEmpty(_dResult.price_level))
        $("#priceInfoRow").hide();
    else {
        var priceDiv = document.createElement("div");
        for (var i = 1; i <= _dResult.price_level; i++) {
            var span = document.createElement("span");
            span.innerHTML = "$";
            priceDiv.append(span);
        }
        $("#priceInfo").html(priceDiv);
    }

    if (ObjectEmpty(_dResult.rating))
        $("#ratingInfoRow").hide();
    else {
        $("#ratingInfo p").html(_dResult.rating);
        $('.rating-tooltip').rating('rate', _dResult.rating);
        $(".rating-tooltip").rating({
            extendSymbol: function (rate) {
                $(this).tooltip
                    ({
                        container: 'body',
                        placement: 'bottom',
                        title: 'Rate ' + rate
                    });
            }
        });
    }

    if (ObjectEmpty(_dResult.url))
        $("#googlePageInfoRow").hide();
    else {
        $("#googlePageInfo a").attr("href", _dResult.url);
        $("#googlePageInfo a").html(_dResult.url);
    }

    if (ObjectEmpty(_dResult.website))
        $("#websiteInfoRow").hide();
    else {
        $("#websiteInfo a").attr("href", _dResult.website);
        $("#websiteInfo a").html(_dResult.website);
    }

    if (ObjectEmpty(_dResult.opening_hours)) {
        $("#hoursInfoRow").hide();
    }
    else {
        var openNowString = "";
        var utcOffset = _dResult.utc_offset;
        var weekHours = _dResult.opening_hours.weekday_text;
        var dayOfWeek = moment().utcOffset(utcOffset).weekday() - 1;

        if (dayOfWeek == -1)
            dayOfWeek = 6;

        var day = weekHours[dayOfWeek];
        weekHours.splice(dayOfWeek, 1);
        var currentDayTime = day.substr(day.indexOf(':') + 1, day.length);

        if (_dResult.opening_hours.open_now) {
            openNowString = "Open Now: " + currentDayTime;
        }
        else
            openNowString = "Closed";

        $("#hoursInfo").html(openNowString);

        var openHoursLink = document.createElement("a");
        openHoursLink.innerHTML = "Daily open hours";
        openHoursLink.style.marginLeft = "10px";
        openHoursLink.href = "";
        openHoursLink.setAttribute("data-toggle", "modal");
        openHoursLink.setAttribute("data-target", "#openHourModal");

        $("#hoursInfo").append(openHoursLink);

        $(".modal-body").html();

        var hoursTable = document.createElement("table");
        hoursTable.className = "table";
        var row = hoursTable.insertRow(-1);

        var headerCell = document.createElement("th");
        headerCell.innerHTML = day.substr(0, day.indexOf(":"));
        row.appendChild(headerCell);

        headerCell = document.createElement("th");
        headerCell.innerHTML = currentDayTime;
        row.appendChild(headerCell);

        for (var p = 0; p < weekHours.length; p++) {
            row = hoursTable.insertRow(-1);

            var cell = row.insertCell(-1);
            cell.innerHTML = weekHours[p].substr(0, weekHours[p].indexOf(":"));

            var cell = row.insertCell(-1);
            cell.innerHTML = weekHours[p].substr(weekHours[p].indexOf(":") + 1, weekHours[p].length);
        }
        $(".modal-body").html(hoursTable);
    }
}

function FillPhotosDiv() {
    $("#photosDiv").empty();
    var photos = _dResult.photos;
    if (ObjectEmpty(photos) || photos.length == 0) {
        var table = GetNoRecordsTable();
        $("#photosDiv").html(table);
    }
    else {
        var colDiv = document.createElement("div");
        colDiv.className = "col-md-12";

        var rowDiv = document.createElement("div");
        rowDiv.className = "row";
        colDiv.append(rowDiv);

        var insidePhotosDiv = document.createElement("div");
        insidePhotosDiv.className = "insidePhotosDiv";

        if (!ObjectEmpty(photos)) {
            for (var i = 0; i < photos.length; i++) {
                var imageAnchor = document.createElement("a");
                imageAnchor.target = "_blank";
                imageAnchor.href = photos[i].getUrl({ 'maxWidth': photos[i].width, 'maxHeight': photos[i].height });

                var image = document.createElement("img");
                image.src = photos[i].getUrl({ 'maxWidth': 250, 'maxHeight': 300 });
                image.alt = "";
                imageAnchor.append(image);

                insidePhotosDiv.append(imageAnchor);
            }
        }
        rowDiv.append(insidePhotosDiv);
        $("#photosDiv").append(colDiv);
    }
}

function FillMapDiv() {
    if ($("#radioOtherLocation").prop("checked") == true) {
        $("#fromText").val($("#locationText").val());
    }

    if ($("#fromText").val().toLowerCase() == "your location" || $("#fromText").val().toLowerCase() == "my location") {
        $("#directionsButton").prop("disabled", false);
    }
    
    $("#toText").val(_dResult.formatted_address);
    $("#detailsMap").attr("accessKey", "Maps");
    $("#mapTypeImage").attr("src", "images/pegman.png");

    var latitude = _dResult.geometry.location.lat();
    var longitude = _dResult.geometry.location.lng();

    _directionsDisplay = new google.maps.DirectionsRenderer;
    _directionsService = new google.maps.DirectionsService;

    var map = new google.maps.Map($("#detailsMap").get(0), {
        zoom: 16,
        center: { lat: latitude, lng: longitude }
    });
    marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map
    });

    _directionsDisplay.setMap(map);
    _directionsDisplay.setPanel($("#right-panel").get(0));

    if (!ObjectEmpty($("#right-panel").html()))
        CalculateAndDisplayRoute();
}

function GetStreetView() {
    var mapMode = $("#detailsMap").attr("accessKey");

    if (mapMode == "Street") {
        FillMapDiv();

        $("#detailsMap").attr("accessKey", "Maps");
        $("#mapTypeImage").attr("src", "images/pegman.png");
    }
    else if (mapMode == "Maps") {
        var panorama;
        var latitude = _dResult.geometry.location.lat();
        var longitude = _dResult.geometry.location.lng();
        panorama = new google.maps.StreetViewPanorama
            (
            $("#detailsMap").get(0),
            {
                position: { lat: latitude, lng: longitude },
                pov: { heading: 165, pitch: 0 },
                zoom: 1
            }
            );

        $("#detailsMap").attr("accessKey", "Street");
        $("#mapTypeImage").attr("src", "images/map.png");
    }
}

function CalculateAndDisplayRoute() {
    $("#right-panel").empty();
    $("#noDirections").remove();

    var latitude = _dResult.geometry.location.lat();
    var longitude = _dResult.geometry.location.lng();

    _directionsDisplay = new google.maps.DirectionsRenderer;
    _directionsService = new google.maps.DirectionsService;

    var map = new google.maps.Map($("#detailsMap").get(0), {
        zoom: 16,
        center: { lat: latitude, lng: longitude }
    });
    marker = new google.maps.Marker({
        position: { lat: latitude, lng: longitude },
        map: map
    });
    _directionsDisplay.setMap(map);
    _directionsDisplay.setPanel($("#right-panel").get(0));

    if ($("#fromText").val().toLowerCase() == "your location" || $("#fromText").val().toLowerCase() == "my location") {
        _dirOriginLat = _myLat;
        _dirOriginLng = _myLon;
    }

    var selectedMode = $("#tMode").val();

    _directionsService.route({
        origin: { lat: _dirOriginLat, lng: _dirOriginLng },
        destination: { lat: latitude, lng: longitude },
        travelMode: google.maps.TravelMode[selectedMode],
        provideRouteAlternatives: true
    }, function (response, status) {
        if (status == 'OK') {
            if (marker != "") {
                marker.setMap(null);
                marker = "";
            }
            _directionsDisplay.setDirections(response);
        }
        else {
            var table = GetNoRecordsTable(false);
            table.style.margin = "0px 0px 10px 0px";
            table.id = "noDirections";
            table.innerHTML = "Unable to find directions from specified location.";
            $("#mapsForm").append(table);
            _directionsDisplay.setMap(map);
        }
    });
}

function FillReviewsDiv() {
    var sorting = _currentReviewsSort;
    var reviews = "";

    if (ObjectEmpty(_dResult.reviews) || _dResult.reviews.length == 0) {
        var table = GetNoRecordsTable();
        $("#insideReviewsDiv").html(table);
    }
    else {
        reviews = _dResult.reviews.slice();
        if (_reviewSorting.Default == sorting) {
            $("#sortOrder").html("Default Order");
        }
        else if (_reviewSorting.LowestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.HighestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.LeastRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time * 1000);
                var nameB = new Date(b.time * 1000);
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.MostRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time * 1000);
                var nameB = new Date(b.time * 1000);
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }

        $("#insideReviewsDiv").empty();
        for (var i = 0; i < reviews.length; i++) {
            var mainDiv = document.createElement("div");
            mainDiv.style.border = "1px solid lightgrey";
            mainDiv.style.marginBottom = "10px";
            mainDiv.style.padding = "10px 10px 15px 10px";

            var imageAnchor = document.createElement("a");
            imageAnchor.style.float = "left";
            imageAnchor.style.margin = "4px 0px 0px 10px";
            imageAnchor.href = reviews[i].author_url;
            imageAnchor.target = "_blank";

            var image = document.createElement("img");
            image.style.width = "60px";
            image.style.height = "60px";
            image.alt = "";
            image.src = reviews[i].profile_photo_url;
            image.style.display = "block";
            imageAnchor.appendChild(image);

            var detailsDiv = document.createElement("div");
            detailsDiv.style.marginLeft = "90px";

            var authorName = document.createElement("a");
            authorName.innerHTML = reviews[i]["author_name"];
            authorName.target = "_blank";
            authorName.href = reviews[i].author_url;
            authorName.style.color = "dodgerblue";
            authorName.style.margin = "10px 0px 0px 0px";
            detailsDiv.appendChild(authorName);

            var breakEl = document.createElement("br");
            detailsDiv.appendChild(breakEl);

            var rating = parseInt(reviews[i].rating);
            for (var j = 1; j <= rating; j++) {
                var span = document.createElement("span");
                span.className = "fas fa-star";
                span.style.display = "inline-block";
                detailsDiv.appendChild(span);
            }

            var ratingDate = document.createElement("p");
            ratingDate.innerHTML = moment.unix(reviews[i].time).format("YYYY-MM-DD HH:mm:ss");
            ratingDate.style.color = "lightgrey";
            ratingDate.style.marginBottom = "0px";
            ratingDate.style.display = "inline-block";

            if(rating != 0 || rating != undefined){
                ratingDate.style.marginLeft = "5px";
            }

            detailsDiv.appendChild(ratingDate);

            var para = document.createElement("p");
            para.innerHTML = reviews[i].text;
            detailsDiv.appendChild(para);

            mainDiv.append(imageAnchor);
            mainDiv.append(detailsDiv);
            $("#insideReviewsDiv").append(mainDiv);
        }
        $("#reviewWebsiteName").html("Google Reviews");
    }
}

function GetYelpBusiness() {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com";
    url += "/yelpmatch?"
    url += "name=" + _dResult.name.normalize('NFD').replace(/[\u0300-\u036f]/g, "") + "&";

    var latitude = _dResult.geometry.location.lat();
    var longitude = _dResult.geometry.location.lng();
    var city = "";
    var state = "";
    var country = "";
    var address1 = "";
    var postalCode = "";

    var addressComp = _dResult.address_components;
    for (var i = 0; i < addressComp.length; i++) {
        var line = addressComp[i];
        var types = line.types;
        if ($.inArray("route", types) > -1) {
            address1 = line.long_name;
        }
        else if ($.inArray("locality", types) > -1) {
            city = line.long_name;
        }
        else if ($.inArray("administrative_area_level_1", types) > -1) {
            state = line.short_name;
        }
        else if ($.inArray("country", types) > -1) {
            country = line.short_name;
        }
        else if ($.inArray("postal_code", types) > -1) {
            postalCode = line.short_name;
        }
    }

    url += "city=" + city + "&";
    url += "state=" + state + "&";
    url += "country=" + country + "&";
    url += "address1=" + address1 + "&";
    url += "postalCode=" + postalCode;

    $.ajax({
        type: "GET",
        dataType: 'json',
        url: url,
        async: true,
        success: function (mainResults) {
            if (!ObjectEmpty(mainResults.businesses) && mainResults.businesses.length != 0) {
                var yelpLat = mainResults.businesses[0].coordinates.latitude;
                var yelpLong = mainResults.businesses[0].coordinates.longitude;
                var distance = 0;
                distance = GetDistanceFromLatLonInKm(latitude, longitude, yelpLat, yelpLong);

                if (distance < 0.5) {
                    var id = mainResults.businesses[0].id;
                    GetYelpReviews(id);
                }
            }
        }
    });
}

function GetYelpReviews(id) {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com";
    url += "/yelpreviews?"
    url += "id=" + id;

    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: url,
            async: true,
            success: function (mainResults) {
                _yelpReviews = mainResults;
            }
        });
}

function ShowYelpReviews() {
    var sorting = _currentReviewsSort;
    var reviews = "";
    if (ObjectEmpty(_yelpReviews) || _yelpReviews.length == 0) {
        var table = GetNoRecordsTable();
        $("#insideReviewsDiv").html(table);
    }
    else {
        reviews = _yelpReviews.reviews.slice();
        if (_reviewSorting.Default == sorting) {
            $("#sortOrder").html("Default Order");
        }
        else if (_reviewSorting.LowestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.HighestRating == sorting) {
            reviews.sort(function (a, b) {
                var nameA = a.rating;
                var nameB = b.rating;
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.LeastRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time_created);
                var nameB = new Date(b.time_created);
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }
                return 0;
            });
        }
        else if (_reviewSorting.MostRecent == sorting) {
            reviews.sort(function (a, b) {
                var nameA = new Date(a.time_created);
                var nameB = new Date(b.time_created);
                if (nameA < nameB) {
                    return 1;
                }
                if (nameA > nameB) {
                    return -1;
                }
                return 0;
            });
        }

        $("#insideReviewsDiv").empty();
        for (var i = 0; i < reviews.length; i++) {
            var mainDiv = document.createElement("div");
            mainDiv.style.border = "1px solid lightgrey";
            mainDiv.style.marginBottom = "10px";
            mainDiv.style.padding = "10px 10px 10px 10px";

            var imageAnchor = document.createElement("a");
            imageAnchor.style.float = "left";
            imageAnchor.style.margin = "5px 0px 0px 10px";
            imageAnchor.href = reviews[i].url;
            imageAnchor.target = "_blank";

            var image = document.createElement("img");
            image.style.width = "60px";
            image.style.height = "60px";
            image.alt = "";
            image.src = reviews[i].user.image_url;
            image.style.display = "block";
            imageAnchor.appendChild(image);

            var detailsDiv = document.createElement("div");
            detailsDiv.style.marginLeft = "90px";

            var authorName = document.createElement("a");
            authorName.innerHTML = reviews[i].user.name;
            authorName.target = "_blank";
            authorName.href = reviews[i].url;
            authorName.style.color = "dodgerblue";
            authorName.style.margin = "10px 0px 0px 0px";
            detailsDiv.appendChild(authorName);

            var breakEl = document.createElement("br");
            detailsDiv.appendChild(breakEl);

            var rating = parseInt(reviews[i].rating);
            for (var j = 1; j <= rating; j++) {
                var span = document.createElement("span");
                span.className = "fas fa-star";
                span.style.display = "inline-block";
                detailsDiv.appendChild(span);
            }

            var ratingDate = document.createElement("p");
            ratingDate.innerHTML = reviews[i].time_created;
            ratingDate.style.color = "lightgrey";
            ratingDate.style.marginBottom = "0px";
            ratingDate.style.display = "inline-block";

            detailsDiv.appendChild(ratingDate);

            var para = document.createElement("p");
            para.innerHTML = reviews[i].text;
            detailsDiv.appendChild(para);

            mainDiv.append(imageAnchor);
            mainDiv.append(detailsDiv);
            $("#insideReviewsDiv").append(mainDiv);
        }
    }
    $("#reviewWebsiteName").html("Yelp Reviews");
}

function SortReviews(sorting) {
    _currentReviewsSort = sorting;
    SelectCurrentSort();

    if ($("#reviewWebsiteName").html() == "Yelp Reviews") {
        ShowYelpReviews();
    }
    else if ($("#reviewWebsiteName").html() == "Google Reviews") {
        FillReviewsDiv();
    }
}

function GetDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = deg2rad(lat2 - lat1);
    var dLon = deg2rad(lon2 - lon1);
    var a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2)
        ;
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c;
    return d;
}

function deg2rad(deg) {
    return deg * (Math.PI / 180)
}

function SelectCurrentSort() {
    if (_reviewSorting.Default == _currentReviewsSort) {
        $("#sortOrder").html("Default Order");
    }
    else if (_reviewSorting.LowestRating == _currentReviewsSort) {
        $("#sortOrder").html("Lowest Rating");
    }
    else if (_reviewSorting.HighestRating == _currentReviewsSort) {
        $("#sortOrder").html("Highest Rating");
    }
    else if (_reviewSorting.LeastRecent == _currentReviewsSort) {
        $("#sortOrder").html("Least Recent");
    }
    else if (_reviewSorting.MostRecent == _currentReviewsSort) {
        $("#sortOrder").html("Most Recent");
    }
}

function HideDetailsDiv() {
    RefreshTable();
    if (_currentTab == "Results") {
        $("#divFavourite").hide();
        $("#divResult").show();
    }
    else {
        _favRowCount = 0;
        FillFavouriteTable();
        $("#divFavourite").show();
        $("#divResult").hide();
    }
    $("detailsDiv").hide();
    $("#detailsButton").show();
}

function CallIpApi() {
    $.ajax
        ({
            type: "GET",
            dataType: 'json',
            url: "http://ip-api.com/json",
            async: true,
            success: function (data) {
                if (!ObjectEmpty(data)) {
                    _globalLat = data.lat;
                    _globalLon = data.lon;

                    _myLat = data.lat;
                    _myLon = data.lon;
                }
            }
        });
}

function GetUrl(mode) {
    var url = "http://googleapicalls.us-east-2.elasticbeanstalk.com";

    if (mode == _urlQueryEnum.NextPage) {
        url += "/nextpage?"
        url += "nextPageToken=" + _nextPageToken;
    }
    else if (mode == _urlQueryEnum.PlaceSearch) {
        var distance = $("#distanceText").val().trim();

        if (distance == "" || distance == undefined)
            distance = (10 * 1609.34).toFixed();
        else
            distance = (distance * 1609.34).toFixed();
        url += "/places?"
        url += "location=" + _globalLat + "," + _globalLon + "&";
        url += "radius=" + distance + "&";
        url += "type=" + $("#category").val() + "&";
        url += "keyword=" + $("#keyWordText").val().trim();
    }
    else if (mode == _urlQueryEnum.GeoCode) {
        url += "/geocode?"
        url += "location=";
        url += encodeURIComponent($('#locationText').val());
    }
    else if (mode == _urlQueryEnum.GeoCodeFrom) {
        url += "/geocode?"
        url += "location=";
        url += encodeURIComponent($('#fromText').val());
    }
    else if (mode == _urlQueryEnum.Details) {
        url += "/details?"
        url += "placeId=" + _currentPlaceId;
    }

    return url;
}

function GetNextPageResults() {
    var table = localStorage.getItem("table" + (_pageCount + 1));

    if (ObjectEmpty(table)) {
        var url = GetUrl(_urlQueryEnum.NextPage);

        $.ajax
            ({
                type: "GET",
                dataType: 'json',
                url: url,
                async: true,
                success: function (mainResults) {
                    CreateTableAndInsertRows(mainResults);
                    $("#prevButton").show();

                    if (_pageCount == 3) {
                        $("#nextButton").hide();
                    }
                },
                error: function () {
                    var table = GetNoRecordsTable(true);
                    $("#innerDivResult").html(table);
                    $("#detailsButton").hide();
                    $("#pageButtons").hide();
                    UpdateProgress(0);
                    $("#progressDiv").hide();
                    $("#divResult").show();
                }

            });
    }
    else {
        var showNextPage = false;

        $("#innerDivResult").html(table);
        _pageCount += 1;
        $("#prevButton").show();

        if (_pageCount == 2) {
            var table = localStorage.getItem("table3");

            if (ObjectEmpty(table))
                showNextPage = true;
        }
        if (_pageCount == 3 || showNextPage) {
            $("#nextButton").hide();
        }
    }
}

function GetPrevPageResults() {
    _pageCount = _pageCount - 1;
    var table = localStorage.getItem("table" + _pageCount);
    $("#innerDivResult").html(table);

    $("#nextButton").show();
    if (_pageCount == 1) {
        $("#prevButton").hide();
    }
}

function ToggleTextbox(rdo) {
    $("#locationText").prop("disabled", !rdo.checked);
    $("#searchButton").prop("disabled", true);
}

function ClearLocation() {
    CallIpApi();
    $("#locationText").val("");
    $("#locationText").prop("disabled", true);
    $("#locationText").removeClass("errorBorder");
    $("#locationFeedback").hide();

    if ($("#keyWordText").val().trim() != "") {
        $("#searchButton").prop("disabled", false);
    }
}

function ClearVariables(event) {
    var scope = angular.element($("body")).scope();
    scope.$apply(function () {
        scope.detDivValue = true;
    })

    $("#divResult").hide();
    $("#searchButton").prop('disabled', true);

    $("#keyWordText").focus();
    $("#keyWordText").val("");
    $("#category").val("default");
    $("#distanceText").val("");

    $("#radioCurLocation").prop("checked", true).trigger("click");

    $("#innerDivResult").empty();
    $("#detailsDiv").hide();
    $("#innerDivFavourite").empty();

    $("#detailsButton").hide();
    $("#favDetailsButton").hide();
    $("#detailsButton").prop("disabled", true);
    $("#favDetailsButton").prop("disabled", true);
    $('#divResultTab').tab('show');
    $("#insideReviewsDiv").empty();

    _currentTab = "Results"

    _mapAlreadySet = false;
    _rowCount = 1;
    _pageCount = 0;
    _currentPlaceId = "";
    _currentReviewsSort = "default";
    event.preventDefault();
}

function ObjectEmpty(value) {
    if (value == "" || value == undefined || value == null)
        return true;
    else
        return false;
}

function initAutocomplete() {
    _autocomplete = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById("locationText")),
        { types: ["geocode"] });
    _autocomplete.addListener("place_changed", fillInAddress);

    _autocompleteDetails = new google.maps.places.Autocomplete(
        /** @type {!HTMLInputElement} */(document.getElementById("fromText")),
        { types: ["geocode"] });
    _autocompleteDetails.addListener("place_changed", fillInAddressDetails);
}

function fillInAddress() {
    var place = _autocomplete.getPlace();
    _globalLat = place.geometry.location.lat();
    _globalLon = place.geometry.location.lng();

    _dirOriginLat = place.geometry.location.lat();
    _dirOriginLng = place.geometry.location.lng();

    _locationAlreadySet = true;
    if ($("#keyWordText").val().trim() != "")
        $("#searchButton").prop("disabled", false);
}

function fillInAddressDetails() {
    var place = _autocompleteDetails.getPlace();
    _dirOriginLat = place.geometry.location.lat();
    _dirOriginLng = place.geometry.location.lng();

    _detLocationAlreadySet = true;
    $("#directionsButton").prop("disabled", false);
}

function geolocate() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function (position) {
            var geolocation =
                {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
            var circle = new google.maps.Circle
                ({
                    center: geolocation,
                    radius: position.coords.accuracy
                });
            _autocomplete.setBounds(circle.getBounds());
            _autocompleteDetails.setBounds(circle.getBounds());
        });
    }
}