define(['N/currentRecord','N/url'],
function(currentRecord,url){

    function printRECTAX(){
        try{
            var scriptUrl = url.resolveScript({
            scriptId: 'customscript_reccs',
            deploymentId: 'customdeploy_reccs'
        });

        window.open(scriptUrl+"&recId="+currentRecord.get().id);

        }catch(err){
            console.log(err)
        }
    }

    return{
        printRECTAX:printRECTAX,
    }
})