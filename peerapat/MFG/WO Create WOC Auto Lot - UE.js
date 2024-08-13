/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Print Button
 * **************************************************************************
 * Date : 10-11-2023
 *
 * Author: Surasak P.
 * Script Description : Add Auto Fill Lot Button
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${10-11-2023} SP : created
 ******************************************************************************/
 define(['N/record'],function(record){

    function beforeLoad(context) {
        
        try{
            if(context.type === context.UserEventType.VIEW ){ 
                var qty = context.newRecord.getValue('quantity');
                if(parseNumber(qty) > 0) {
                    var status = context.newRecord.getValue('status').toLowerCase();
                    if(status == 'in process'|| status == 'released') {
                        context.form.clientScriptModulePath = "./WO Create WOC Auto Lot - CS.js";  
                        context.form.addButton({
                            id : 'custpage_filllot',
                            label : 'Enter Completion with Lot',
                            functionName: 'createWOCLot' 
                        });   
                    }
                }
                
            }

        }catch(err) {
            log.debug("error@beforeLoad",err);
        }
    
    }

    function parseNumber(val){
        var parsed = parseFloat(val)
        return isNaN(parsed)?0:parsed;
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    return{
        beforeLoad:beforeLoad	
    }
});