/**
 * @NApiVersion 2.0
 * @NScriptType UserEventScript
 * @NModuleScope SameAccount
 */
 /*******************************************************************************
 * CLIENTNAME:PP
 * ADD Print Button in RV
 * **************************************************************************
 * Date : 30-04-2022
 *
 * Author: Surasak P.
 * Script Description : Add Print Button & Map with client script
 * 
 *
 * REVISION HISTORY
 *
 * Revision 1.0 ${30-04-2022} SP : created
 ******************************************************************************/
  define(['N/record'],function(record){

    function beforeLoad(context) {
        
        try{
            if(context.type === "view"){    
                context.form.clientScriptModulePath = "./RV Add Button - CS.js";  
                var rvRecord = record.load(
                    {
                        type: 'customerpayment', 
                        id: context.newRecord.id
                    }
                ); 
                var customForm = rvRecord.getText('customform');    
                log.debug('customForm',customForm); 
                    context.form.addButton({
                        id : 'custpage_print_rv',
                        label : 'Receipt Voucher',
                        functionName: 'printRV' 
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