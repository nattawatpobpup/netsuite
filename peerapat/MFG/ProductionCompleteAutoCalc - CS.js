/**
 * @NApiVersion 2.x
 * @NScriptType ClientScript
 * @NModuleScope SameAccount
 */
define(['N/currentRecord', 'N/record', 'N/search', 'N/ui/dialog', '../Lib/moment.js'],
/**
 * @param{currentRecord} currentRecord
 * @param{record} record
 * @param{search} search
 */
function(currentRecord, record, search, dialog, moment) {

    function fieldChanged(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var fieldId = scriptContext.fieldId;

        var formCode = currentRecord.getValue({
            fieldId: 'custrecord_pdc_form_code'
        });

        //Liquid/Powder Production Completion (F1)
        //Liquid/Powder Production Completion (F3) New
        if (formCode == 'F1' || formCode == 'F3') { 
            if(fieldId == 'custrecord_pdc_emptytank_weight') {
                var emptyTank = currentRecord.getValue({
                    fieldId: fieldId
                });
                var endTank = currentRecord.getValue({
                    fieldId : 'custrecord_pdc_endtank_weight'
                });
                emptyTank = isEmpty(emptyTank) ? 0 : emptyTank;
                endTank = isEmpty(endTank) ? 0 : endTank;

                //#region Calc NET PRODUCT WEIGHT
                var netProdWeight = endTank - emptyTank;
    
                currentRecord.setValue({
                    fieldId: 'custrecord_pdc_netprod_weight',
                    value : netProdWeight
                });  
                //#endregion Calc NET PRODUCT WEIGHT
            }
            if(fieldId == 'custrecord_pdc_endtank_weight') {
                var emptyTank = currentRecord.getValue({
                    fieldId : 'custrecord_pdc_emptytank_weight'
                });
                var endTank = currentRecord.getValue({
                    fieldId: fieldId
                });
                emptyTank = isEmpty(emptyTank) ? 0 : emptyTank;
                endTank = isEmpty(endTank) ? 0 : endTank;

                //#region Calc NET PRODUCT WEIGHT
                var netProdWeight = endTank - emptyTank;
    
                currentRecord.setValue({
                    fieldId: 'custrecord_pdc_netprod_weight',
                    value : netProdWeight
                });  
                //#endregion Calc NET PRODUCT WEIGHT  
            }
        }

        /* if (formCode == 'F4') {
            if(fieldId == 'custrecord_pdc_pkp_break1stop') {
                // BREAKDOWN1 TIME START
                var startBreakDw1 = currentRecord.getValue({ fieldId: 'custrecord_pdc_pkp_break1start' });
                // BREAKDOWN1 TIME STOP
                var endBreakDw1 = currentRecord.getValue({ fieldId: 'custrecord_pdc_pkp_break1stop' });

                var diffBreakDw1 = 0;
                if (!isEmptyString(startBreakDw1) && !isEmptyString(endBreakDw1)) {
                    console.log(startBreakDw1);
                    console.log(endBreakDw1);
                    var startTime = moment(startBreakDw1);
                    var endTime = moment(endBreakDw1);
                    console.log(startTime);
                    console.log(endTime);
                    diffBreakDw1 = endTime.diff(startTime, 'minutes');
                }
                console.log(diffBreakDw1);
                var calc = moment.duration(diffBreakDw1, "minutes").asHours();
                console.log(calc);
            }
            
        } */
    }

    function postSourcing(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var fieldId = scriptContext.fieldId;
        /* console.log(currentRecord);
        console.log(fieldId); */
    }

    function pageInit(scriptContext) {
        var currentRecord = scriptContext.currentRecord;
        var formCode = currentRecord.getValue({
            fieldId: 'custrecord_pdc_form_code'
        });
        console.log(formCode);
        if (formCode != 'F2') {
            currentRecord.getField({
                fieldId: 'custpage_pdc_bomname'
            }).isDisplay = false;
        } else {
            currentRecord.getField({
                fieldId: 'custpage_pdc_bomname'
            }).isDisplay = true;
        }
    }

    /**
     * Validation function to be executed when record is saved.
     *
     * @param {Object} scriptContext
     * @param {Record} scriptContext.currentRecord - Current form record
     * @returns {boolean} Return true if record is valid
     *
     * @since 2015.2
     */
    function saveRecord(scriptContext) {
        var record = currentRecord.get();
        var selectedFormId = record.getValue({
            fieldId: 'customform'
        });

        var formCode = record.getValue({ fieldId: 'custrecord_pdc_form_code' }); 
        
        var isPass = false;

        //Liquid/Powder Production Completion (F1)
        //Packing Production Completion (F2)
        //Liquid/Powder Production Completion (F3) New
        if (formCode == "F1" || formCode == "F2" || formCode == "F3") {
            var resultYes = record.getValue({ fieldId: 'custrecord_pdc_result_yes' }); 
            var resultNo = record.getValue({ fieldId: 'custrecord_pdc_result_no' }); 
            if (resultYes && !resultNo) {
                isPass = true;
            } else if (!resultYes && resultNo) {
                isPass = true;
            }
        } else if (formCode == "F4") { //Packaging Production Form (F4) (V2)
            var oee = record.getValue({ fieldId: 'custrecord_pdc_oee' }); 
            if (!isEmptyString(oee)) {
                isPass = true;
            }
        }
        if (!isPass) {
            dialog.alert({ 
                title: 'Alert', 
                message: 'กรุณากดปุ่ม Calculate ก่อนกด Save หรือติดต่อAdmin' 
            });
            return false;
        }
        return true;
    }

    const calculate = function () {
        try {
            var record = currentRecord.get();

            var woId = record.getValue({
                fieldId: 'custrecord_pdc_workorder'
            });

            var formCode = record.getValue({
                fieldId: 'custrecord_pdc_form_code'
            });
    
            if (formCode == 'F1') { //Liquid/Powder Production Completion (F1)
                if (woId) {
                    var totalQty = getTotalQty(woId, formCode);
                    // ปริมาณวัตถุดิบตามใบเบิก (Direct Material)
                    record.setValue({
                        fieldId: 'custrecord_pdc_dm_kg',
                        value : totalQty
                    });   
                    // ปริมาณสินค้าตามทฤษฎี (KG)
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_stdqty',
                        value : totalQty
                    }); 
                }
                // ปริมาณสินค้าที่ผลิตได้จริง (KG)
                var netProdWeight = record.getValue({ fieldId: 'custrecord_pdc_netprod_weight' }); 
                if (!isEmptyString(netProdWeight)) {
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_actqty',
                        value : netProdWeight
                    });
                }
                
                //  %ค่าความผิดพลาด
                var stdQty = record.getValue({ fieldId: 'custrecord_pdc_liquid_stdqty' }); 
                if (!isEmptyString(stdQty) || !isEmptyString(netProdWeight)) {
                    var _stdQty = isEmptyString(stdQty) ? 0 : stdQty;
                    var _netProdWeight = isEmptyString(netProdWeight) ? 0 : netProdWeight;
                    var percentYields = 0;
                    percentYields = ((_stdQty - _netProdWeight) / _stdQty) * 100;
                    percentYields = percentYields > 0 ? percentYields.toFixed(2) : percentYields;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_percyields',
                        value : percentYields
                    });
        
                    // Clear the value before setting.
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_yes',
                        value : false
                    });
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_no',
                        value : false
                    });
                    // สรุปผล
                    if (percentYields >= -2 && percentYields <= 2) {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_yes',
                            value : true
                        });
                    } else {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_no',
                            value : true
                        });
                    }
                }
            } else if (formCode == 'F2') { //Packing Production Completion (F2)
                // น้ำหนักบรรจุต่อชิ้น (KG)
                var weightQty = record.getValue({ fieldId: 'custrecord_pdc_pk_wg_piece' });

                // Number of actual packing (จํานวนบรรจุภัณฑ์ที่บรรจุได้)
                var actualPack = record.getValue({ fieldId: 'custrecord_pdc_pk_actpack' });

                // จํานวนบรรจุภัณฑ์ที่ต้องบรรจุตามแผน
                var qtyPlan = "";
                if (woId) {
                    var workOrd = getMainWorkOrd(woId);
                    qtyPlan = workOrd.quantity;
                }
    
                // ปริมาณสินค้าตามทฤษฎี (KG)
                var stdQty = "";
                if (!isEmptyString(weightQty) || !isEmptyString(qtyPlan)) {
                    var _weightQty = isEmptyString(weightQty) ? 0 : weightQty;
                    var _qtyPlan = isEmptyString(qtyPlan) ? 0 : qtyPlan;
                    stdQty = _weightQty * _qtyPlan;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_stdqty',
                        value : stdQty
                    });
                }

                // ปริมาณสินค้าที่ผลิตได้จริง (KG)
                var actQty = "";
                if (!isEmptyString(weightQty) || !isEmptyString(actualPack)) {
                    var _weightQty = isEmptyString(weightQty) ? 0 : weightQty;
                    var _actualPack = isEmptyString(actualPack) ? 0 : actualPack;
                    actQty = _weightQty * _actualPack;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_actqty',
                        value : actQty
                    }); 
                } 
    
                //  %ค่าความผิดพลาด
                if (!isEmptyString(stdQty) || !isEmptyString(actQty)) {
                    var _stdQty = isEmptyString(stdQty) ? 0 : stdQty;
                    var _actQty = isEmptyString(actQty) ? 0 : actQty;
                    var percentYields = 0;
                    percentYields = ((_stdQty - _actQty) / _stdQty) * 100;
                    percentYields = percentYields > 0 ? percentYields.toFixed(2) : percentYields;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_percyields',
                        value : percentYields
                    });
                    // Clear the value before setting.
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_yes',
                        value : false
                    });
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_no',
                        value : false
                    });
                    // สรุปผล
                    if (percentYields >= -2 && percentYields <= 2) {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_yes',
                            value : true
                        });
                    } else {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_no',
                            value : true
                        });
                    }
                }
            } else if (formCode == 'F3') { //Liquid/Powder Production Completion (F3) New
                var built = "";
                var stdQty = "";
                if (woId) {
                    stdQty = getTotalQty(woId, formCode);

                    // จำนวนบรรจุภัณฑ์ที่บรรจุได้
                    var workOrd = getMainWorkOrd(woId);
                    built = workOrd.built;

                    // ปริมาณวัตถุดิบตามใบเบิก (Direct Material)
                    record.setValue({
                        fieldId: 'custrecord_pdc_dm_kg',
                        value : stdQty
                    });   
                    // ปริมาณสินค้าตามทฤษฎี (KG)
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_stdqty',
                        value : stdQty
                    }); 
                }

                // น้ำหนักบรรจุต่อชิ้น (KG)
                var weightQty = record.getValue({ fieldId: 'custrecord_pdc_pk_wg_piece' }); 

                // ปริมาณสินค้าที่ผลิตได้จริง (KG)
                var actQty = "";
                if (!isEmptyString(weightQty) || !isEmptyString(built)) {
                    var _weightQty = isEmptyString(weightQty) ? 0 : weightQty;
                    var _built = isEmptyString(built) ? 0 : built;
                    actQty = _weightQty * _built;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_actqty',
                        value : actQty
                    });
                }

                //  %ค่าความผิดพลาด
                if (!isEmptyString(stdQty) || !isEmptyString(actQty)) {
                    var _stdQty = isEmptyString(stdQty) ? 0 : stdQty;
                    var _actQty = isEmptyString(actQty) ? 0 : actQty;
                    var percentYields = 0;
                    percentYields = ((_stdQty - _actQty) / _stdQty) * 100;
                    percentYields = percentYields > 0 ? percentYields.toFixed(2) : percentYields;
                    record.setValue({
                        fieldId: 'custrecord_pdc_liquid_percyields',
                        value : percentYields
                    });
                    // Clear the value before setting.
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_yes',
                        value : false
                    });
                    record.setValue({
                        fieldId: 'custrecord_pdc_result_no',
                        value : false
                    });
                    // สรุปผล
                    if (percentYields >= -2 && percentYields <= 2) {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_yes',
                            value : true
                        });
                    } else {
                        record.setValue({
                            fieldId: 'custrecord_pdc_result_no',
                            value : true
                        });
                    }
                }
            } else if (formCode == 'F4') { //Packaging Production Form (F4) (V2)
                var qtyPlan = "";
                if (woId) {
                    var workOrd = getMainWorkOrd(woId);
                    qtyPlan = workOrd.quantity;
                    // จำนวนชิ้นงานตามแผน (EA.)
                    record.setValue({
                        fieldId: 'custrecord_pdc_qty_plan',
                        value : qtyPlan
                    });   
                }
    
                // จำนวนชิ้นงานหน้าเครื่อง (EA.)
                var pdMachine = record.getValue({ fieldId: 'custrecord_pdc_qty_pd_mc' }); 
                // จำนวนชิ้นงาน SET UP (EA.)
                var setUpPieces = record.getValue({ fieldId: 'custrecord_pdc_pkp_setuppieces' }); 
                // จำนวนชิ้นงานทดสอบ (EA.)
                var pdTest = record.getValue({ fieldId: 'custrecord_pdc_qty_pd_test' });
                // จำนวนชิ้นงานไม่ได้มาตรฐาน (EA.) 
                var nonStd = record.getValue({ fieldId: 'custrecord_pdc_pkp_nonstdqty' });
    
                // จำนวนชิ้นงานดี (EA.)
                if (!isEmptyString(pdMachine) || !isEmptyString(setUpPieces) || !isEmptyString(pdTest) || !isEmptyString(nonStd)) {
                    var _pdMachine = isEmptyString(pdMachine) ? 0 : pdMachine;
                    var _setUpPieces = isEmptyString(setUpPieces) ? 0 : setUpPieces;
                    var _pdTest = isEmptyString(pdTest) ? 0 : pdTest;
                    var _nonStd = isEmptyString(nonStd) ? 0 : nonStd;
                    var workGood = _pdMachine - _setUpPieces - _pdTest - _nonStd;
                    record.setValue({
                        fieldId: 'custrecord_pdc_wk_gd',
                        value : workGood
                    });  
                }
    
                // %YIELD
                if (!isEmptyString(pdMachine) || !isEmptyString(nonStd)) {
                    var _pdMachine = isEmptyString(pdMachine) ? 0 : pdMachine;
                    var _nonStd = isEmptyString(nonStd) ? 0 : nonStd;
                    var percentYields = 0;
                    percentYields = ((_pdMachine - _nonStd) / _pdMachine) * 100;
                    percentYields = Number.isInteger(percentYields) ? percentYields : percentYields.toFixed(2);
                    record.setValue({
                        fieldId: 'custrecord_pdc_perc_yield',
                        value : percentYields
                    });
                }
    
                // %ความคลาดเคลื่อน
                if (!isEmptyString(qtyPlan) || !isEmptyString(pdMachine)) {
                    var _qtyPlan = isEmptyString(qtyPlan) ? 0 : qtyPlan;
                    var _pdMachine = isEmptyString(pdMachine) ? 0 : pdMachine;
                    var percentVarience = 0;
                    percentVarience = (((_qtyPlan - _pdMachine) * 100) / _qtyPlan);
                    percentVarience = Number.isInteger(percentVarience) ? percentVarience : percentVarience.toFixed(2);
                    record.setValue({
                        fieldId: 'custrecord_pdc_perc_varience',
                        value : percentVarience
                    });
                }
    
                // %ของเสีย
                if (!isEmptyString(nonStd) || !isEmptyString(pdMachine)) {
                    var _nonStd = isEmptyString(nonStd) ? 0 : nonStd;
                    var _pdMachine = isEmptyString(pdMachine) ? 0 : pdMachine;
                    var percentWaste = 0;
                    percentWaste = ((_nonStd * 100) / _pdMachine);
                    percentWaste = Number.isInteger(percentWaste) ? percentWaste : percentWaste.toFixed(2);
                    record.setValue({
                        fieldId: 'custrecord_pdc_waste',
                        value : percentWaste
                    });
                }

                // เวลาทำงานตามแผน
                var wotId = record.getValue({ fieldId: 'custrecord_pdc_wk_time_list' });
                var wotHour = 0;
                if (wotId) {
                    var wotObj = getWorkTime(wotId);
                    if (!isEmptyStringObject(wotObj)) {
                        wotHour = wotObj.hour;
                        // เวลาที่ใช้ตามแผน (HR)
                        record.setValue({
                            fieldId: 'custrecord_pdc_wrk_plan',
                            value : wotHour
                        });
                    }
                }

                // เวลาสูญเปล่า (HR)
                var wasteTime = calcWasteTime(record);
                record.setValue({
                    fieldId: 'custrecord_pdc_wk_waste',
                    value : wasteTime
                });
                
                // เวลาปิดเครื่อง
                var closeMachineTime = record.getValue({ fieldId: 'custrecord_pdc_ti_cl_mc' });
                // เวลาเปิดเครื่อง
                var openMachineTime = record.getValue({ fieldId: 'custrecord_pdc_time_opn_mc' });

                // เวลาที่เครื่องจักรทำงานจริง (HR)
                var diff = "";
                if (!isEmptyString(closeMachineTime) && !isEmptyString(openMachineTime)) {
                    var openTime = moment(openMachineTime);
                    var closeTime = moment(closeMachineTime);
                    diff = closeTime.diff(openTime, 'minutes');
                    if (diff >= 0) {
                        //diff = minutes_to_hhmm(diff);
                        diff = moment.duration(diff, "minutes").asHours();
                        record.setValue({
                            fieldId: 'custrecord_pdc_wk_mc',
                            value : diff
                        });
                    }
                }

                // เวลาทำงานจริง (HR)
                var workingHr = 0;
                if (!isEmptyString(diff) && !isEmptyString(wasteTime)) {
                    workingHr = diff - wasteTime;
                    workingHr = isEmptyString(workingHr) ? 0 : workingHr.toFixed(2);
                    record.setValue({
                        fieldId: 'custrecord_pdc_wk_hr_rl',
                        value : workingHr
                    });
                }

                // %A
                var avalLoss = 0;
                var breakDwTime = calcBreakDw(record);
                //breakDwTime = minutes_to_hhmm(breakDwTime);
                breakDwTime = moment.duration(breakDwTime, "minutes").asHours();

                if (!isEmptyString(wotHour) && !isEmptyString(breakDwTime) && !isEmptyString(workingHr)) {
                    avalLoss = (wotHour - breakDwTime) / workingHr;
                    //avalLoss = avalLoss > 0 ? avalLoss.toFixed(2) : avalLoss;
                }

                // %P
                // จำนวนชิ้นงานหน้าเครื่อง (EA.) pdMachine
                // จำนวนชิ้นงานตามแผน (EA.) qtyPlan
                var perfLoss = 0;
                if (!isEmptyString(pdMachine) && !isEmptyString(qtyPlan)) {
                    perfLoss = pdMachine / qtyPlan;
                    //perfLoss = perfLoss > 0 ? perfLoss.toFixed(2) : perfLoss;
                }

                // %Q
                var qualityLoss = 0;
                if (!isEmptyString(pdMachine) && !isEmptyString(nonStd)) {
                    qualityLoss = (pdMachine - nonStd) / pdMachine;
                    // = qualityLoss > 0 ? qualityLoss.toFixed(2) : qualityLoss;
                }

                // %OEE
                // custrecord_pdc_oee
                if (!isEmptyString(avalLoss) && !isEmptyString(perfLoss) && !isEmptyString(qualityLoss)) {
                    console.log(avalLoss)
                    console.log(perfLoss)
                    console.log(qualityLoss)
                    var oee = (avalLoss * perfLoss * qualityLoss) * 100;
                    oee = isEmptyString(oee) ? 0 : oee.toFixed(2);
                    record.setValue({
                        fieldId: 'custrecord_pdc_oee',
                        value : oee
                    });
                }

            }
        } catch (err) {
            console.log(err)
        }
    }

    const calcBreakDw = function (record) {
        // BREAKDOWN1 TIME START
        var startBreakDw1 = record.getValue({ fieldId: 'custrecord_pdc_pkp_break1start' });
        // BREAKDOWN1 TIME STOP
        var endBreakDw1 = record.getValue({ fieldId: 'custrecord_pdc_pkp_break1stop' });

        var diffBreakDw1 = 0;
        if (!isEmptyString(startBreakDw1) && !isEmptyString(endBreakDw1)) {
            var startTime = moment(startBreakDw1);
            var endTime = moment(endBreakDw1);
            diffBreakDw1 = endTime.diff(startTime, 'minutes');
        }

        // BREAKDOWN2 TIME START
        var startBreakDw2 = record.getValue({ fieldId: 'custrecord_pdc_pkp_break2start' });
        // BREAKDOWN2 TIME STOP
        var endBreakDw2 = record.getValue({ fieldId: 'custrecord_pdc_pkp_break2stop' });

        var diffBreakDw2 = 0;
        if (!isEmptyString(startBreakDw2) && !isEmptyString(endBreakDw2)) {
            var startTime = moment(startBreakDw2);
            var endTime = moment(endBreakDw2);
            diffBreakDw2 = endTime.diff(startTime, 'minutes');
        }

        // BREAKDOWN3 TIME START
        var startBreakDw3 = record.getValue({ fieldId: 'custrecord_pkp_break3start' });
        // BREAKDOWN3 TIME STOP
        var endBreakDw3 = record.getValue({ fieldId: 'custrecord_pdc_pkp_break3stop' });

        var diffBreakDw3 = 0;
        if (!isEmptyString(startBreakDw3) && !isEmptyString(endBreakDw3)) {
            var startTime = moment(startBreakDw3);
            var endTime = moment(endBreakDw3);
            diffBreakDw3 = endTime.diff(startTime, 'minutes');
        }

        var breakDwTimeMinute = diffBreakDw1 + diffBreakDw2 + diffBreakDw3;
        return breakDwTimeMinute;
    }

    const calcWasteTime = function (record) {
        // เวลาเปิดเครื่อง
        var openMachineTime = record.getValue({ fieldId: 'custrecord_pdc_time_opn_mc' });
        // เวลาเริ่มเปลี่ยน MOLD
        var startChgMold = record.getValue({ fieldId: 'custrecord_pdc_chg_mold' });
        // เวลาสิ้นสุดเปลี่ยน MOLD
        var endChgMold = record.getValue({ fieldId: 'custrecord_pdc_time_end_mold' });

        var diffChgMold = 0;
        if (!isEmptyString(startChgMold) && !isEmptyString(endChgMold)) {
            var startTime = moment(startChgMold);
            var endTime = moment(endChgMold);
            diffChgMold = endTime.diff(startTime, 'minutes');
        }

        // เวลา SET UP เครื่องเสร็จ
        var endSetup = record.getValue({ fieldId: 'custrecord_pdc_wk_setup' });

        var diffSetup = 0;
        if (!isEmptyString(openMachineTime) && !isEmptyString(endSetup)) {
            var openTime = moment(openMachineTime);
            var endTime = moment(endSetup);
            diffSetup = endTime.diff(openTime, 'minutes');
        }

        // BREAKDOWN TIME
        var breakDwTime = calcBreakDw(record);

        // เวลาพัก 1 เริ่มต้น
        var startBreak1 = record.getValue({ fieldId: 'custrecord_pdc_break_st1' });
        // เวลาพัก 1 สิ้นสุด
        var endBreak1 = record.getValue({ fieldId: 'custrecord_pdc_break_ed1' });

        var diffBreak1 = 0;
        if (!isEmptyString(startBreak1) && !isEmptyString(endBreak1)) {
            var startTime = moment(startBreak1);
            var endTime = moment(endBreak1);
            diffBreak1 = endTime.diff(startTime, 'minutes');
        }

        // เวลาพัก 2 เริ่มต้น
        var startBreak2 = record.getValue({ fieldId: 'custrecord_pdc_break_st2' });
        // เวลาพัก 2 สิ้นสุด
        var endBreak2 = record.getValue({ fieldId: 'custrecord_pdc_break_ed2' });

        var diffBreak2 = 0;
        if (!isEmptyString(startBreak2) && !isEmptyString(endBreak2)) {
            var startTime = moment(startBreak2);
            var endTime = moment(endBreak2);
            diffBreak2 = endTime.diff(startTime, 'minutes');
        }

        // เวลาพัก 3 เริ่มต้น
        var startBreak3 = record.getValue({ fieldId: 'custrecord_pdc_break_st3' });
        // เวลาพัก 3 สิ้นสุด
        var endBreak3 = record.getValue({ fieldId: 'custrecord_pdc_break_ed3' });

        var diffBreak3 = 0;
        if (!isEmptyString(startBreak3) && !isEmptyString(endBreak3)) {
            var startTime = moment(startBreak3);
            var endTime = moment(endBreak3);
            diffBreak3 = endTime.diff(startTime, 'minutes');
        }

        // เวลาสูญเปล่า (HR)
        var wasteTimeMinute = diffChgMold + diffSetup + breakDwTime + diffBreak1 + diffBreak2 + diffBreak3;
        //var wasteTime = minutes_to_hhmm(wasteTimeMinute);
        var wasteTime = moment.duration(wasteTimeMinute, "minutes").asHours();
        return wasteTime;
    }

    const getMainWorkOrd = function (woId) {
        var mainQty = 0;
        var mainBuilt = 0;
        if (woId) {
            var woSearchObj = search.create({
                type: search.Type.TRANSACTION,
                filters:
                [
                    ['type', 'anyof', 'WorkOrd'],
                    "AND",
                    ['mainline', 'is', 'T'],
                    "AND",
                    ['internalid', 'anyof', woId]
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      summary: search.Summary.GROUP,
                      label: "Internal ID"
                   }),
                   search.createColumn({
                        name: "quantity",
                        summary: search.Summary.GROUP,
                        function: "absoluteValue",
                        label: "Quantity"
                   }),
                   search.createColumn({
                        name: "built",
                        summary: search.Summary.GROUP,
                        function: "absoluteValue",
                        label: "Built"
                   })
                ]
            });
            woSearchObj.run().each(function (result) {
                var qty = result.getValue(({'summary': 'GROUP', 'function': 'absoluteValue', 'name': 'quantity'}));
                var built = result.getValue(({'summary': 'GROUP', 'function': 'absoluteValue', 'name': 'built'}));
                mainQty = mainQty + parseFloat(qty);
                mainBuilt = mainBuilt + parseFloat(built);
                return true;
            });
        }

        return {quantity : mainQty, built: mainBuilt};
    }

    const getTotalQty = function (woId, formCode) {
        console.log(woId);
        var totalQty = 0;
        if (woId) {
            // Total quantity of work order issue for production, auto calculate from BOM
            var woIssueSearchObj = search.create({
                type: search.Type.TRANSACTION,
                filters:
                [
                    ['type', 'anyof', 'WOIssue'],
                    "AND",
                    ['mainline', 'is', 'F'],
                    "AND",
                    ['createdfrom', 'anyof', woId],
                    "AND",
                    ['item.custitem_labor_cost', 'is', 'F']
                ],
                columns:
                [
                   search.createColumn({
                      name: "internalid",
                      summary: search.Summary.GROUP,
                      label: "Internal ID"
                   }),
                   search.createColumn({
                        name: "quantity",
                        summary: search.Summary.GROUP,
                        function: "absoluteValue",
                        label: "Quantity"
                   }),
                   search.createColumn({
                        name: "internalid",
                        summary: search.Summary.GROUP,
                        join: "item",
                        label: "Internal ID"
                   })
                ]
            });

            if (formCode == "F3") {
                var availableStockGroupIdArr = [];

                var wpc01Filter = ["name", "contains", "WP-C01"];
                var wpc02Filter = ["name", "contains", "WP-C02"];
                var wpc03Filter = ["name", "contains", "WP-C03"];
                var wpc04Filter = ["name", "contains", "WP-C04"];
                var wpc05Filter = ["name", "contains", "WP-C05"];
                var wpc06Filter = ["name", "contains", "WP-C06"];

                var stockGroupSearchObj = search.create({
                    type: 'customrecordcustomrecord_pp_stock_group',
                    filters:
                    [
                        ['isinactive', search.Operator.IS, 'F'], "AND", 
                        [
                            wpc01Filter, "OR", 
                            wpc02Filter, "OR", 
                            wpc03Filter, "OR", 
                            wpc04Filter, "OR", 
                            wpc05Filter, "OR", 
                            wpc06Filter
                        ]
                    ],
                    columns: ['name', 'custrecordcustrecord_description_stk'],
                });
                stockGroupSearchObj.run().each(function (result) {
                    availableStockGroupIdArr.push(result.id);
                    return true;
                });

                if (availableStockGroupIdArr.length > 0) {
                    var filterArray = [];
                    var currentFilterArray = woIssueSearchObj.filterExpression;
                    filterArray.push(["item.custitemcustitem_pp_stock_group", search.Operator.ANYOF, availableStockGroupIdArr]);
                    filterArray.push('and');
                    filterArray = filterArray.concat(currentFilterArray);
                    woIssueSearchObj.filterExpression = filterArray;
                }
            }

            woIssueSearchObj.run().each(function (result) {
                var qty = result.getValue(({'summary': 'GROUP', 'function': 'absoluteValue', 'name': 'quantity'}));
                totalQty = totalQty + parseFloat(qty);
                return true;
            });
        }

        return totalQty;
    }

    const getWorkTime = function (wotId) {
        if (wotId) {
            var wotSearchObj = search.create({
                type: "customrecord_work_time_list",
                columns: ['internalid', 'custrecord_pdc_wk_ti', 'custrecord_pdc_wk_st', 'custrecord_pdc_wk_ed', 'custrecord_pdc_wk_hr_list'],
                filters: [
                    ['internalid', search.Operator.ANYOF, wotId]
                ]
            });
            var wotSearchResult = wotSearchObj.run().getRange({start: 0, end: 1});
            if (wotSearchResult.length > 0) {
                var internalid = wotSearchResult[0].getValue(({'name': 'internalid'}));
                var time = wotSearchResult[0].getValue(({'name': 'custrecord_pdc_wk_ti'}));
                var startTime = wotSearchResult[0].getValue(({'name': 'custrecord_pdc_wk_st'}));
                var endTime = wotSearchResult[0].getValue(({'name': 'custrecord_pdc_wk_ed'}));
                var hour = wotSearchResult[0].getValue(({'name': 'custrecord_pdc_wk_hr_list'}));

                return {
                    internalid: internalid,
                    time: time,
                    startTime: startTime,
                    endTime: endTime,
                    hour: hour,
                }
            }
            return {};
        }
        return {};
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    function isEmptyString(str) {
        return ( str === null || str === "" )
    }

    function isEmptyStringObject(obj) {
        for(var prop in obj) {
            if(obj.hasOwnProperty(prop))
                return false;
        }
        return true;
    }

    const minutes_to_hhmm = function (numberOfMinutes) {
        var duration = moment.duration(numberOfMinutes, 'minutes');
        
        //calculate hours
        var hh = (duration.years()*(365*24)) + (duration.months()*(30*24)) + (duration.days()*24) + (duration.hours());
        
        //get minutes
        var mm = duration.minutes();
        
        //return total time in hh:mm format
        return hh+'.'+mm;
    }

    return {
        pageInit: pageInit,
        fieldChanged: fieldChanged,
        postSourcing: postSourcing,
        saveRecord: saveRecord,
        calculate: calculate
    };
    
});
