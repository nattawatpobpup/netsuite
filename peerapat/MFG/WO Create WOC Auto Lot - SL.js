/**
 *@NApiVersion 2.0
 *@NScriptType Suitelet
 */
 /*******************************************************************************
 * CLIENTNAME: PP
 * PP
 * Create WO Complete with auto lot
 * **************************************************************************
 * Date : 10-11-2023
 *
 * Author: Surasak P.
 * Script Description : Create WO Complete with auto lot
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${10-11-2023} SP : created
 ******************************************************************************/

 define(["N/record",'N/search','N/redirect','N/error',"../Lib/moment.js"], function (record,search,redirect,error,moment) {
    function onRequest(context){
        try {
            if (context.request.method === 'GET') {
                var woId = context.request.parameters.woid;
                if(!isEmpty(woId)) {
                    var objRecord = record.transform({
                        fromType: 'workorder',
                        fromId: woId,
                        toType: 'workordercompletion',
                        isDynamic: false,
                    });

                    var qty = objRecord.getValue('orderquantity');
                    if(parseNumber(qty) > 0) {
                        var mfgRoute = objRecord.getValue('manufacturingrouting');
                        if(!isEmpty(mfgRoute)) {
                            var opObj = getOpearatingSeq(mfgRoute);
                            if(isObject(opObj)) {
                                log.debug('opObj',opObj);
                                objRecord.setText('startoperation',opObj.min);
                                objRecord.setText('endoperation',opObj.max);
                            }
                        } else {
                            var errorObj = error.create({
                                code: 'NO_ROUTING',
                                message: 'Work Order has not spcified Manufacturing Routing.'
                            });
                    
                            throw errorObj;
                        }


                        var qcId = getQcinspection(woId);
                        log.debug('qcId',qcId);
                        if(!isEmpty(qcId)) {
                            objRecord.setValue('custbody_pp_wo_qcstatus',qcId);
                        }

                        objRecord.setValue('completedquantity',qty);
                        var woNo = objRecord.getText('createdfrom');
                        if(woNo.indexOf('#')>-1) {
                            woNo = woNo.substr(woNo.indexOf('#')+1);
                            objRecord.setValue('custbody_wo_mfg_lot',woNo);
    
                            objRecord.setValue('quantity',qty);

                            var lotExpire = get204Expire(woId);
                            log.debug('lotExpire',lotExpire);
                            if(isEmpty(lotExpire)) {
                                lotExpire = objRecord.getValue({
                                    fieldId : 'custbody_wo_mfg_lotexpiredate'
                                })
                            } else {
                                var tempDate = new Date(moment(lotExpire,'D/M/YYYY').toISOString());
                                objRecord.setValue({
                                    fieldId : 'custbody_wo_mfg_lotexpiredate',
                                    value : tempDate
                                });

                                if(!isEmpty(woId)) {
                                    try {
                                        record.submitFields({
                                            type: 'workorder',
                                            id: woId,
                                            values: {
                                                custbody_wo_mfg_lotexpiredate : tempDate
                                            },
                                            options: {
                                                enableSourcing: false,
                                                ignoreMandatoryFields : true
                                            }
                                        });
                                    } catch(err){
                                            //lib.reportError("execute","Error Create WO Issue",err)            
                                            log.debug("error@execute",err);
                                            //log.error("error@execute",err);
                                    }

                                }
                            }


                            var inventoryDetailAvail = objRecord.getValue({
                                fieldId: 'inventorydetailavail'
                            });
                
                            var wpInvDetailRecord;
                
                            if(inventoryDetailAvail == 'T') {
                                wpInvDetailRecord = objRecord.getSubrecord({
                                    fieldId: 'inventorydetail'
                                }); 
        
                                wpInvDetailRecord.insertLine({
                                    sublistId: "inventoryassignment",
                                    line : 0
                                });
        
                                wpInvDetailRecord.setSublistValue({
                                    sublistId: "inventoryassignment",
                                    fieldId: "receiptinventorynumber", 
                                    line : 0,
                                    value: woNo
                                });
                                var tempDate = new Date(moment(lotExpire,'D/M/YYYY').toISOString());
                                wpInvDetailRecord.setSublistValue({
                                    sublistId: "inventoryassignment", 
                                    fieldId: "expirationdate", 
                                    line : 0,
                                    value: tempDate
                                });
        
                                wpInvDetailRecord.setSublistValue({
                                    sublistId: "inventoryassignment", 
                                    fieldId: "quantity", 
                                    line : 0,
                                    value: qty
                                });
    
        
                            }
                        }
                    }

                    var recordId = objRecord.save({
                        ignoreMandatoryFields: true
                    });

                    if(!isEmpty(recordId)) {
                        redirect.toRecord({
                            type : 'workordercompletion',
                            id : recordId
                        });
                    }
                }
            }
        } catch(err){
            //lib.reportError("execute","Error Create WO Issue",err)            
            log.debug("error@execute",err);
            context.response.write(err.message);
            //log.error("error@execute",err);
         }
    }

    function getQcinspection(woId) {
        var customrecord_pp_qc_entriesSearchObj = search.create({
            type: "customrecord_pp_qc_entries",
            filters:
            [
               ["custrecord_pp_trx_workorder","anyof",woId], 
               "AND", 
               ["isinactive","is","F"]
            ],
            columns:
            [
               search.createColumn({
                  name: "internalid",
                  summary: "MAX",
                  label: "Internal ID"
               })
            ]
         });

         var qcId = '';
         customrecord_pp_qc_entriesSearchObj.run().each(function (result) {
            qcId  = result.getValue(customrecord_pp_qc_entriesSearchObj.columns[0]);
            return true;
         }) 
         
         return qcId;
    }

    function getOpearatingSeq(mfgRoute) {
        var manufacturingroutingSearchObj = search.create({
            type: "manufacturingrouting",
            filters:
            [
               ["internalid","anyof",mfgRoute]
            ],
            columns:
            [
               search.createColumn({
                  name: "sequence",
                  summary: "MIN",
                  label: "Operation Sequence"
               }),
               search.createColumn({
                  name: "sequence",
                  summary: "MAX",
                  label: "Operation Sequence"
               })
            ]
         });

         var returnObj = {
            min : '',
            max : ''
         }

         manufacturingroutingSearchObj.run().each(function (result) {
            var minOp  = result.getValue(manufacturingroutingSearchObj.columns[0]);
            var maxOp  = result.getValue(manufacturingroutingSearchObj.columns[1]);
            returnObj.min = minOp;
            returnObj.max = maxOp;
            return true;
         })

         return returnObj;
    }

    function get204Expire(woId) {
        var transactionSearchObj = search.create({
            type: "transaction",
            filters:
            [
               ["createdfrom","anyof",woId], 
               "AND", 
               ["item.name","startswith","204990"]
            ],
            columns:
            [
               search.createColumn({
                  name: "expirationdate",
                  join: "inventoryDetail",
                  summary: "MIN",
                  sort: search.Sort.ASC,
                  label: "Expiration Date"
               })
            ]
         });

         var searchCoulumns= transactionSearchObj.columns;
         var pageData =transactionSearchObj.runPaged({pageSize:1000});
         var page = pageData.pageRanges;

         var expireDate = '';
         for(var k=0;k<page.length;k++){
            var data = pageData.fetch({index:k}).data;
            for (var j = 0; j < data.length; j++){
                var result = data[j];
                expireDate = result.getValue(searchCoulumns[0]);   
            }
        }

        return expireDate
    }
    function getAllLot(locationAllArr,itemAllArr) {
        var inventorynumberSearchObj = search.create({
            type: "inventorynumber",
            filters:
            [
               ["item","anyof",itemAllArr], 
               "AND", 
               ["location","anyof",locationAllArr]
            ],
            columns:
            [
                search.createColumn({name: "internalid", label: "Internal ID"}),
                search.createColumn({name: "item", label: "Item"}),
                search.createColumn({name: "location", label: "Location"}),
                search.createColumn({
                    name: "inventorynumber",
                    sort: search.Sort.ASC,
                    label: "Number"
                }),
                search.createColumn({name: "quantityavailable", label: "Available"}),  
                search.createColumn({name: "expirationdate", label: "Expiration Date"})                       
            ]
         });
         var searchCoulumns= inventorynumberSearchObj.columns;
         var pageData =inventorynumberSearchObj.runPaged({pageSize:1000});
         var page = pageData.pageRanges;
         var allLotObj = {};
         for(var k=0;k<page.length;k++){
             var data = pageData.fetch({index:k}).data;
             for (var j = 0; j < data.length; j++){
                 var result = data[j];
                 var lotId = result.getValue(searchCoulumns[0]);
                 var itemId = result.getValue(searchCoulumns[1]);
                 var locationId = result.getValue(searchCoulumns[2]);
                 var lotNo = result.getValue(searchCoulumns[3]);
                 var lotQty = result.getValue(searchCoulumns[4]);
                 var lotExpire = result.getValue(searchCoulumns[5]);
    
    
                if (typeof allLotObj[itemId] === 'undefined') {
                    allLotObj[itemId] = [];
                }

                allLotObj[itemId].push({
                    lotid : lotId,
                    lotno : lotNo,
                    lotqty : parseNumber(lotQty)
                })
    
    
             }
         }
    
         return allLotObj;
    }
    function isEmpty(str) {
        return (!str || 0 === str.length);
     }

     function isObject(val) {
        return (typeof val === 'object');
    }  
    
    function isEmptyObj(obj) {
        if(isObject(obj)) 
            return Object.keys(obj).length === 0;
        else
            return true;
    }

    function parseNumber(val){
        var parsed = parseFloat(val)
        return isNaN(parsed)?0:parsed;
    }    
    return {
        onRequest: onRequest
    };
});