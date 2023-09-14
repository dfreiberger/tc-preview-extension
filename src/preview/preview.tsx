import "azure-devops-ui/Core/override.css";
import "./preview.scss";

import * as SDK from "azure-devops-extension-sdk";

import { Header } from "azure-devops-ui/Header";
import { Page } from "azure-devops-ui/Page";
import { SurfaceBackground, SurfaceContext } from "azure-devops-ui/Surface";

import { CommonServiceIds, IHostNavigationService, IHostPageLayoutService, IExtensionDataManager, IProjectPageService, IExtensionDataService, ILocationService  } from "azure-devops-extension-api";
import { CoreRestClient } from "azure-devops-extension-api/Core";


import * as React from "react"; 

import * as ReactDOM from "react-dom";

import IecViewer from "./iecviewer";

 
export interface IPreviewState {
    xml? : XMLDocument;
    parentUrl? : string;
    urlParams? : { [key: string]: string };
}

class PreviewContent extends React.Component<{}, IPreviewState> {

    private _dataManager?: IExtensionDataManager;

    constructor(props: {}) {
        super(props);
        this.state = {};
    }

    public componentDidMount() { 
        this.initializeState();
    }

    private async initializeState(): Promise<void> {
        await SDK.init();
        await SDK.ready();
        const fileContent = SDK.getConfiguration().content;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(fileContent, "text/xml"); 

        // extract the page url via AzDO SDK... non trivial since we can't just look at the window.location since it's in an iframe
        const locationService = await SDK.getService<ILocationService>(CommonServiceIds.LocationService);

        const hostBaseUrl = await locationService.getResourceAreaLocation(
          CoreRestClient.RESOURCE_AREA_ID
        );

        const navigationService = await SDK.getService<IHostNavigationService >(CommonServiceIds.HostNavigationService);

        const queryParams = await navigationService.getQueryParams(); 
        const pageRoute = await navigationService.getPageRoute();
        const routeValues = {
            project: pageRoute.routeValues.project,
            path: queryParams.path,
            _a: queryParams._a
        }
        const routeUrl = await locationService.routeUrl(pageRoute.id, routeValues);
        this.setState({ xml : xmlDoc, parentUrl: routeUrl, urlParams: queryParams }); 
    }

    public render(): JSX.Element {
        const { xml, parentUrl, urlParams } = this.state;
        return (
            <SurfaceContext.Provider value={{ background: SurfaceBackground.normal }}>
                <Page className="tc-preview-page absolute-fill">
                    <div className="page-content">
                        <IecViewer xml={xml} urlParams={urlParams} parentUrl={parentUrl}/>
                    </div>
                </Page>
            </SurfaceContext.Provider>
        );
    }
}
ReactDOM.render(<PreviewContent />, document.getElementById("root"));
