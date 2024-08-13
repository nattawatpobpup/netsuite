/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Print Button
 * **************************************************************************
 * Date : 08-09-2022
 *
 * Author: Surasak P.
 * Script Description : Add Print Button & Map with client script
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-09-2022} SP : created
 ******************************************************************************/
  define(['N/record'],function(record){

    function beforeLoad(context) {
        
        try{
            if(context.type === "view"){    
                context.form.clientScriptModulePath = "./TEST - WOC Form print - CS.js";  
                var cnvcRecord = record.load(
                    {
                        type: 'workordercompletion', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = cnvcRecord.getText('customform');    
                log.debug('customForm',customForm); 
                    context.form.addButton({
                        id : 'custpage_print_wocform_test',
                        label : 'WO TEST',
                        functionName: 'printWOCTest' 
                    });                                                                                                                                                                
                    
            }

        }catch(err) {
            log.debug("error@beforeLoad",err);
        }
    
    }

    function isEmpty(str) {
        return (!str || 0 === str.length);
    }

    return{
        beforeLoad:beforeLoad	
    }
});