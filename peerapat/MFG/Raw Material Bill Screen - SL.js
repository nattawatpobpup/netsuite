/**

* @NApiVersion 2.0
* @NScriptType Suitelet
* @NModuleScope SameAccount
*/
define(['N/ui/serverWidget',"N/format","N/search","N/task",'N/url',"N/redirect","N/runtime","N/record","N/config",'N/query',"../Lib/moment.js"],
/**
 * @param {serverWidget} serverWidget
 * @param {format} format
 * @param {search} search
 * @param {task} task
 * @param {url} url
 * @param {redirect} redirect
 * @param {runtime} runtime
 * @param {record} record
 * @param {config} config
 * @param {moment} moment
 * @param {dateLib} dateLib
 */
function(serverWidget,format,search,task,url,redirect,runtime,record,config,query,moment) {
   /**
    * Definition of the Suitelet script trigger point.
    *
    * @param {Object} context
    * @param {ServerRequest} context.request - Encapsulation of the incoming request
    * @param {ServerResponse} context.response - Encapsulation of the Suitelet response
    * @Since 2015.2
    */
   function onRequest(context) {
   
        var request = context.request;
        var response  = context.response;
        try{
            if (request.method == 'GET'  ) {
                ///CHECK USER PERMISSION
                var userObj = runtime.getCurrentUser();
        
                
                var lang = getLanguage();
                // title of the page 
                var titleTxt = 'ใบเบิกวัตถุดิบรวม (ภายใน)';
                if(lang == 'th_TH') {
                    titleTxt = 'ใบเบิกวัตถุดิบรวม (ภายใน)';
                }

                var form = serverWidget.createForm ({
                    title : titleTxt
                });
        

                var paramGroupTxt = 'Define Report Parameter'
                if(lang == 'th_TH') {
                    paramGroupTxt = 'กำหนดเงื่อนไขการออกรายงาน'
                }

                var paramGroup = form.addFieldGroup ({
                    id : 'custpage_paramgroup',
                    label : paramGroupTxt
                });

                var beginDateTxt = 'Production Start Date From'
                if(lang == 'th_TH') {
                    beginDateTxt = 'ระบุวันเริ่มต้นผลิตเริ่มต้น'
                }

                var beginDate = form.addField({
                    id : 'custpage_begindate',
                    type : serverWidget.FieldType.DATE,
                    label : beginDateTxt,
                    container : 'custpage_paramgroup'
                })

                beginDate.defaultValue = new Date();

                var endDateTxt = 'Production Start Date End'
                if(lang == 'th_TH') {
                    endDateTxt = 'ระบุวันเริ่มต้นผลิตสิ้นสุด'
                }

                var endDate = form.addField({
                    id : 'custpage_enddate',
                    type : serverWidget.FieldType.DATE,
                    label : endDateTxt,
                    container : 'custpage_paramgroup'
                })

                endDate.defaultValue = new Date();

                var filter1Txt = 'WO Filter1'
                if(lang == 'th_TH') {
                    filter1Txt = 'WO Filter1'
                }

                var filter1List = form.addField({
                    id : 'custpage_filter1',
                    type : serverWidget.FieldType.SELECT,
                    label : filter1Txt,
                    source : 'customrecord_lst_mfg_filter1',
                    container : 'custpage_paramgroup'
                }).updateBreakType({
                    breakType: 'startcol'
                });


                var filter2Txt = 'WO Filter2'
                if(lang == 'th_TH') {
                    filter2Txt = 'WO Filter2'
                }

                var filter2List = form.addField({
                    id : 'custpage_filter2',
                    type : serverWidget.FieldType.SELECT,
                    label : filter2Txt,
                    source : 'customrecord_lst_mfg_filter2',
                    container : 'custpage_paramgroup'
                })

                var filterloTxt = 'Location'
                if(lang == 'th_TH') {
                    filterloTxt = 'Location'
                }

                var filterloList = form.addField({
                    id : 'custpage_filterlo',
                    type : serverWidget.FieldType.SELECT,
                    label : filterloTxt,
                    source : 'location',
                    container : 'custpage_paramgroup'
                })

                var button = form.addSubmitButton({
                        label : 'Submit'
                });

                context.response.writePage(form);
            } else { // POST method
                // get the field details and store on variables
                var begindate = context.request.parameters.custpage_begindate;
                var enddate = context.request.parameters.custpage_enddate;
                var filter1 = context.request.parameters.custpage_filter1;
                var filter2 = context.request.parameters.custpage_filter2;
                var filterlo = context.request.parameters.custpage_filterlo;

                redirect.toSuitelet({
                    scriptId: 'customscript_pp_sl_mfg_rawmat',
                    deploymentId: 'customdeploy_pp_sl_mfg_rawmat',
                    parameters: {
                        'begindate': begindate,
                        'enddate' : enddate,
                        'filter1' : filter1,
                        'filter2' : filter2,
                        'filterlo' : filterlo
                    } 
                });
                
            }

        } catch( e ) {		
            
            log.error( { title: 'error', details: { 'error': e } } );

        }	
   
   }

    function checkOneWorld(){
        var featureInEffect = runtime.isFeatureInEffect({
            feature: "Subsidiaries"
        });
        
        return featureInEffect;
    }

    function getLanguage() {
        var userPreference = config.load({
            type: config.Type.USER_PREFERENCES
        });
        var pref = userPreference.getFields();
        var lang;
        if(pref.indexOf('LANGUAGE') > -1) {
            lang = userPreference.getValue('LANGUAGE');
        }

        return lang;
    }


    function fieldSorter(fields) {
        return function (a, b) {
            return fields
                .map(function (o) {
                    var dir = 1;
                    if (o[0] === '-') {
                    dir = -1;
                    o=o.substring(1);
                    }
                    if (a[o] > b[o]) return dir;
                    if (a[o] < b[o]) return -(dir);
                    return 0;
                })
                .reduce(function firstNonZeroValue (p,n) {
                    return p ? p : n;
                }, 0);
        };
    }


    function getCompanyRestrict(role) {
        var sql = "SELECT subsidiaryoption, effectivesubsidiaries \
        FROM role \
        WHERE id = " + role;
        
        var roleArr = runQuery(sql);
        //log.debug('roleArr',roleArr);
        var companyArr = [];
        if(roleArr.length>0) {
            if(!isEmpty(roleArr[0].effectivesubsidiaries)) {
                companyArr = roleArr[0].effectivesubsidiaries.split(",").map(function(item) {
                                    return item.trim();
                })
            }
        }
        return companyArr;
    }

    function getCurrentTask(batchId) {
        var sql = "SELECT custrecord_gl_taskid as taskid \
        FROM customrecord_gl_report_state \
        WHERE custrecord_batch_id = '" + batchId + "'";

        var stateArr = runQuery(sql);

        var taskId = '';
        if(stateArr.length > 0) {
            taskId = stateArr[0].taskid;
        }

        return taskId;          
    }

    function getCompany() {
        var sql = "SELECT id,name \
            FROM subsidiary \
            WHERE iselimination = 'F' AND isinactive = 'F'"
        
        var companyArr = runQuery(sql);

        return companyArr;
    }

   function getPeriodObj(periodId) {
        var sql = "SELECT id,periodname as name,startdate,enddate \
        FROM accountingperiod \
        WHERE isquarter = 'F' \
        AND isadjust = 'F' \
        AND isyear ='F' \
        AND closed = 'F' \
        AND id = " + periodId;

        var periodArr = runQuery(sql);

        var periodObj;
        if(periodArr.length > 0) {
            periodObj = periodArr[0];
        }

        return periodObj;    
   }

   function getPeriod() {
        var sql = "SELECT id,periodname as name \
            FROM accountingperiod \
            WHERE isquarter = 'F' \
            AND isadjust = 'F' \
            AND isyear ='F' \
            AND closed = 'F' \
            ORDER BY startdate";

        var periodArr = runQuery(sql);

        return periodArr;
        
   }

   function findCurrentPeriod(currentDate) {
        var sql = "SELECT id,periodname as name \
                FROM accountingperiod \
                WHERE isquarter = 'F' \
                AND isadjust = 'F' \
                AND isyear ='F' \
                AND closed = 'F' \
                AND startdate <= '" + currentDate + "' \
                AND enddate >= '" + currentDate + "' \
                ORDER BY startdate";

        var periodArr = runQuery(sql);

        var periodId;
        if(periodArr.length > 0) {
            periodId = periodArr[0].id;
        }

        return periodId;

   }

    function runQuery( sql ) {

        try {	

            var queryParams = new Array();

            var moreRows = true;	

            var rows = new Array();						

            var paginatedRowBegin = 1;

            var paginatedRowEnd = 5000;						

            do {			

                var paginatedSQL = 'SELECT * FROM ( SELECT ROWNUM AS ROWNUMBER, * FROM (' + sql + ' ) ) WHERE ( ROWNUMBER BETWEEN ' + paginatedRowBegin + ' AND ' + paginatedRowEnd + ')';

                var queryResults = query.runSuiteQL( { query: paginatedSQL, params: queryParams } ).asMappedResults(); 	
            
                rows = rows.concat( queryResults );	
                
                if ( queryResults.length < 5000 ) { moreRows = false; }

                paginatedRowBegin = paginatedRowBegin + 5000;
                paginatedRowEnd = paginatedRowEnd + 5000;
            
            } while ( moreRows );
                                                                
        } catch( e ) {		

            log.error( { title: 'selectAllRows - error', details: { 'sql': sql, 'queryParams': queryParams, 'error': e } } );

        }	
        
        return rows;

    }

   function getSearchInternalId(id) {
    var savedsearchSearchObj = search.create({
        type: "savedsearch",
        filters:
        [
           ["id","is",id]
        ],
        columns:
        [
           search.createColumn({name: "internalid", label: "Internal ID"})
        ]
    });
    var ssid;
    savedsearchSearchObj.run().each(function(result) {
       ssid = result.getValue(savedsearchSearchObj.columns[0]);
       return true;
    });
    
    return ssid;
    
   }

    function parseNumber(val){
        var parsed = parseFloat(val);
        return isNaN(parsed)?0:parsed;
    }

   function isEmpty(str) {
      return (!str || 0 === str.length);
   }

   function isEmptyObj(obj) {
      return Object.keys(obj).length === 0;
   }   

    function isObject(val) {
        return (typeof val === 'object');
    }   

    function formatCurrency(val){
        var parsed = parseFloat(val)
        return isNaN(parsed)?0:parsed.toFixed(0).replace(/\d(?=(\d{3})+\.)/g, '$&,');
    }


   return {
      onRequest: onRequest
   };
   
});