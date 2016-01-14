///////////////////////////////////////////////////////////////////////////
// Copyright © 2014 Esri. All Rights Reserved.
//
// Licensed under the Apache License Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
///////////////////////////////////////////////////////////////////////////

define(['dojo/_base/declare',
    'dojo/_base/html',
    'dojo/query',
    'dijit/_WidgetsInTemplateMixin',
    'jimu/BaseWidget',
    'esri/TimeExtent',
    'esri/dijit/TimeSlider',
    'dojo/_base/array','esri/layers/FeatureLayer',
    'dojo/_base/lang', 'esri/request', 'esri/tasks/query', 'esri/tasks/StatisticDefinition', 'esri/tasks/QueryTask', "esri/symbols/SimpleMarkerSymbol", "esri/symbols/SimpleFillSymbol", "esri/Color"
],
  function (declare, html, query, _WidgetsInTemplateMixin, BaseWidget, TimeExtent, TimeSlider, array, FeatureLayer, lang, esriRequest, Query, StatisticDefinition, QueryTask, SimpleMarkerSymbol, SimpleFillSymbol , Color) {
      var clazz = declare([BaseWidget, _WidgetsInTemplateMixin], {

          _hasContent: null,

          postCreate: function () {
              this.inherited(arguments);

              var layerName = lang.getObject('stops_layer', false, this.config);
              var operationalLayer = lang.getObject('map.itemInfo.itemData.operationalLayers', false, this);
              this.stops_layer = new FeatureLayer(this._getLayer(operationalLayer, layerName).url, { mode: FeatureLayer.MODE_SELECTION });
              this.stops_layer.setRenderer(this._getLayer(operationalLayer, layerName).layerObject.renderer);
              this.map.addLayer(this.stops_layer);
              
              var layerName = lang.getObject('path_layer', false, this.config);
              this.path_layer = new FeatureLayer(this._getLayer(operationalLayer, layerName).url, { mode: FeatureLayer.MODE_SELECTION });
              this.path_layer.setRenderer(this._getLayer(operationalLayer, layerName).layerObject.renderer);
              this.map.addLayer(this.path_layer);
          },

          startup: function () {
              this.inherited(arguments);
                         
              // create time slider
              var tableName = lang.getObject('distance_table', false, this.config);
              var table = lang.getObject('map.itemInfo.itemData.tables', false, this);

              var requestHandle = esriRequest({
                  "url": this._getLayer(table, tableName).url,
                  "content": {
                      "f": "json"
                  },
                  "callbackParamName": "callback"
              }).then(lang.hitch(this, function (result) {
                  var timeSlider = new TimeSlider({}, this.timeSliderDiv);
                  this.map.setTimeSlider(timeSlider);
                  timeSlider.setThumbCount(1);
                  var extentObj = lang.getObject('timeInfo.timeExtent', false, result);
                  var extent = new TimeExtent(new Date(extentObj[0]), new Date(extentObj[1]));
                  timeSlider.createTimeStopsByTimeInterval(extent, 1, 'esriTimeUnitsDays');
                  timeSlider.on("time-extent-change", lang.hitch(this, this.extentChanged));
                  timeSlider.startup();

              }));


              

          },
          extentChanged: function (time) {

              var tableName = lang.getObject('distance_table', false, this.config);
              var table = lang.getObject('map.itemInfo.itemData.tables', false, this);

              var q = new Query();
              q.timeExtent = time;

              var statisticDefinition = new StatisticDefinition();
              statisticDefinition.statisticType = "sum";
              statisticDefinition.onStatisticField = "km";
              statisticDefinition.outStatisticFieldName = "TotalKm";

              q.outStatistics = [statisticDefinition];

              var qT = new QueryTask(this._getLayer(table, tableName).url);
              qT.execute(q)
              .then(lang.hitch(this, function(totalF){
                  var total = lang.getObject('attributes.TotalKm', false, totalF.features[0]);
                  
                  var q = new Query();
                  q.where = 'travel_distance <=' + total*1000;
                  var layerName = lang.getObject('stops_layer', false, this.config);
                  var operationalLayer = lang.getObject('map.itemInfo.itemData.operationalLayers', false, this);

                  this.stops_layer.selectFeatures(q)
                  this.path_layer.selectFeatures(q)
              }));
            
              
              /*
2) query total km extent
setSelectionSymbol(symbol) is its symbol with alpha = 0
4) query path <= total km -> select 
4) get next path slice of remaining km -> select
5) query stops <= total km -> select
*/
          },
          _getLayer: function (items, name) {
              // filter all the items with name and return the first url
              var tableArray = array.filter(items, lang.partial(this._areStringsEqual, 'title', name));
              return tableArray[0];
          },

          _areStringsEqual: function (objectString, item, context) {
              if (!context) {
                  context = this;
              }
              // return true if this.objectString is equal to the item
              var object = lang.getObject(objectString, false, context) || '';
              return object.toLowerCase() === item.toLowerCase();
          }


      });

      return clazz;
  });