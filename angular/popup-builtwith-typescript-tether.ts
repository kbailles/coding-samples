module insite_admin {
    "use strict";

    declare var Tether;

    export interface IPopupChannel {
        togglePopup(element: HTMLElement): void;
        onTogglePopup(scope: ng.IScope, handler: Function): void;
    }
    export class PopupChannel implements IPopupChannel {
        private TOGGLE_POPUP: string = "togglePopup";

        static $inject = ["$rootScope"];
        constructor(protected $rootScope: ng.IScope) { }

        togglePopup(element: HTMLElement): void {
            this.$rootScope.$broadcast(this.TOGGLE_POPUP, {
                popupTarget: element
            });
        }
        onTogglePopup(scope: ng.IScope, handler: Function): void {
            scope.$on(this.TOGGLE_POPUP, (e, args) => handler(args));
        }

        public static serviceName = "popupChannel";
    }

    export interface IPopupScope extends ng.IScope {
        offset: string;
        position: string;
        targetOffset: string;
        targetPosition: string;
    }
    export class Popup implements ng.IDirective {
        private isActive: boolean = false;

        restrict = "AE";
        replace = true;
        template = "<div class='popup' ng-transclude></div>";
        transclude = true;
        scope = {
            offset: "@",
            position: "@",
            targetOffset: "@",
            targetPosition: "@"
        }
        
        constructor(protected PopupChannel: IPopupChannel) { }

        public link = (scope: IPopupScope, elm: ng.IAugmentedJQuery): any => {
            var options = {
                element: elm[0],
                enabled: false,
                target: null,
                offset: scope.offset || "0 0",
                attachment: scope.position || "top right",
                targetOffset: scope.targetOffset || "0 0",
                targetAttachment: scope.targetPosition || "bottom right"
            }
            var popup = null;

            var showPopup = () => {
                if (popup) {
                    this.isActive = true;
                    popup.enable();
                }
            }

            var hidePopup = () => {
                if (popup) {
                    this.isActive = false;
                    popup.disable();
                }
            }

            this.PopupChannel.onTogglePopup(scope, (args) => {
                if (elm.attr("id") !== $(args.popupTarget).attr("popup-toggle")) {
                     return;
                }

                options.target = args.popupTarget;
                if (!popup) {
                    popup = new Tether(options);
                } else {
                    popup.setOptions(options);
                }
                
                if (!this.isActive) {
                    showPopup();
                } else {
                    hidePopup();
                }
            });

            //Requirement:
            //Clicking away from the popup should dismiss it
            var handleDocumentClicks = e => {
                if (elm[0].contains(<HTMLElement>e.target)) {
                    return;
                }
                
                var el = e.target;
                var isPopupToggle = false;
                do {
                    if (el instanceof HTMLElement && el.attributes["popup-toggle"]) {
                        isPopupToggle = true;
                        break;
                    }
                } while ((el = <HTMLElement>el.parentNode));

                if (isPopupToggle && elm[0].id === el.attributes["popup-toggle"].value) {
                    return;
                }

                hidePopup();
            }
            $("body").on("click", handleDocumentClicks);


            scope.$on("$destroy", () => {
                if (popup) {
                    popup.destroy();
                }

                $("body").off("click", handleDocumentClicks);
            });
        }

        static factory(): ng.IDirectiveFactory {
            var directive = (PopupChannel: IPopupChannel) => new Popup(PopupChannel);
            directive.$inject = [PopupChannel.serviceName];
            return directive;
        }
    }

    export class PopupToggle implements ng.IDirective {
        restrict = "A";
        
        constructor(protected PopupChannel: IPopupChannel) { }

        public link = (scope: ng.IScope, elm: ng.IAugmentedJQuery): any => {
            elm.on("click", (e) => {
                e.preventDefault();
                this.PopupChannel.togglePopup(elm[0]);

                if (e.target instanceof HTMLElement) {
                    (<HTMLElement>e.target).blur();
                }
            });

            scope.$on("$destroy", () => elm.off());
        }

        static factory(): ng.IDirectiveFactory {
            var directive = (PopupChannel: IPopupChannel) => new PopupToggle(PopupChannel);
            directive.$inject = [PopupChannel.serviceName];

            return directive;
        }
    }
    angular.module("sample")
        .service(PopupChannel.serviceName, PopupChannel)
        .directive("popup", Popup.factory())
        .directive("popupToggle", PopupToggle.factory());
}
