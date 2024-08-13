define(['N/currentRecord',"N/search","N/ui/dialog",'N/url'],
function(currentRecord,search,dialog,url){
    function createWOCLot() {

        var scriptID = "customscript_pp_sl_wo_woclot";
        var scriptDeployID = "customdeploy_pp_sl_wo_woclot";
        var currentRec = currentRecord.get();
        var options = {
            title: "Comfirmation",
            message: "Do you want to create a Work Order Completion with an automatic lot?"
        };
        dialog.confirm(options).then(success).catch(failure);
        function success(result) {
            console.log("confirm create " + result);
            if (result) {
                var param = {
                    woid : currentRec.id,
                };        
        
                var scriptUrl = url.resolveScript({
                    scriptId: scriptID,
                    deploymentId: scriptDeployID,
                    returnExternalUrl: false,
                    params : param
                });
        
                window.open(scriptUrl);
            }
        }



    }
    
    return{
        createWOCLot:createWOCLot
    }
})