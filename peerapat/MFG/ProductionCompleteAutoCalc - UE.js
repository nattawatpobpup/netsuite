/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/error', 'N/log', 'N/record', 'N/runtime', 'N/search', 'N/ui/serverWidget'],
    /**
 * @param{error} error
 * @param{log} log
 * @param{record} record
 * @param{runtime} runtime
 * @param{search} search
 */
    (error, log, record, runtime, search, serverWidget) => {
        /**
         * Defines the function definition that is executed before record is loaded.
         * @param {Object} scriptContext
         * @param {Record} scriptContext.newRecord - New record
         * @param {string} scriptContext.type - Trigger type; use values from the context.UserEventType enum
         * @param {Form} scriptContext.form - Current form
         * @param {ServletRequest} scriptContext.request - HTTP request information sent from the browser for a client action only.
         * @since 2015.2
         */
        const beforeLoad = (scriptContext) => {
            try{
                scriptContext.form.clientScriptModulePath = "./ProductionCompleteAutoCalc - CS.js";  
                scriptContext.form.addButton({
                    id : 'custpage_pdc_calc_btn',
                    label : 'Calculate',
                    functionName: 'calculate' 
                });  

            } catch(err) {
                log.debug("error@beforeLoad",err);
            }
        }

        return {beforeLoad}

    });
