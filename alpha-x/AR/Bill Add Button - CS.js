define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printBill(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_simple_bill',
            deploymentId: 'customdeploy_simple_bill'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }
    

    return{
        printBill:printBill
    }
})